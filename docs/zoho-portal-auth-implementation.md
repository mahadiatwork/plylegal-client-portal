# Zoho Portal Auth Implementation Notes

## Contacts Fields

Create these Zoho Contacts fields and use these API names:

- `Portal_Access` (Picklist: `Active`, `Inactive`)
- `Temporary_Password` (Single line)
- `Password_Reset_Token` (Single line)
- `Needs_Password_Change` (Boolean)

Recommended permissions:

- Restrict write access to workflows/admin profiles.
- Treat `Temporary_Password` and `Password_Reset_Token` as hashed values at rest.

## Deluge Workflow Sketch

Trigger: Contact edited and `Portal_Access` changes.

```javascript
if(input.Portal_Access == "Active")
{
    tempPwd = generateSecurePassword(12);
    tempPwdHash = sha256(tempPwd);

    resp = invokeurl
    [
        url: "https://portal-domain.com/api/admin/create-user"
        type: POST
        headers: {"Authorization":"Bearer <ZOHO_WEBHOOK_SECRET>"}
        parameters: {
            "email": input.Email,
            "tempPassword": tempPwd,
            "firstName": input.First_Name,
            "lastName": input.Last_Name,
            "phone": input.Phone,
            "mobile": input.Mobile,
            "zohoContactId": input.ID
        }
        content-type: "application/json"
    ];

    if(resp.get("success") == true)
    {
        updateMap = map();
        updateMap.put("Temporary_Password", tempPwdHash);
        updateMap.put("Needs_Password_Change", true);
        zoho.crm.updateRecord("Contacts", input.ID.toLong(), updateMap);

        sendmail
        [
            from : zoho.adminuserid
            to : input.Email
            subject : "Your portal login details"
            message : "Portal URL: https://portal-domain.com/login\nTemporary password: " + tempPwd
        ];
    }
}
else if(input.Portal_Access == "Inactive")
{
    invokeurl
    [
        url: "https://portal-domain.com/api/admin/revoke-access"
        type: POST
        headers: {"Authorization":"Bearer <ZOHO_WEBHOOK_SECRET>"}
        parameters: {"email": input.Email, "zohoContactId": input.ID}
        content-type: "application/json"
    ];

    updateMap = map();
    updateMap.put("Temporary_Password", "");
    updateMap.put("Password_Reset_Token", "");
    updateMap.put("Needs_Password_Change", true);
    zoho.crm.updateRecord("Contacts", input.ID.toLong(), updateMap);
}
```

## Deluge Reference (Firebase-mapped)

Use this as a near drop-in pattern based on your Supabase-style reference, adapted for this portal's Firebase endpoints and field names.

```javascript
void automation.provision_portal_user(Int recordId)
{
    // ========= 1) Generate Random Temp Password =========
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    password = "";
    for each n in {1,2,3,4,5,6,7,8,9,10,11,12}
    {
        r = randomnumber(0, chars.length() - 1);
        password = password + chars.subString(r, r + 1);
    }

    // ========= 2) Load Contact =========
    // Switch module name if your workflow is not on Contacts
    record = zoho.crm.getRecordById("Contacts", recordId);
    email = ifnull(record.get("Email"), "");
    firstName = ifnull(record.get("First_Name"), "");
    lastName = ifnull(record.get("Last_Name"), "");
    fullName = (firstName + " " + lastName).trim();
    portalAccess = ifnull(record.get("Portal_Access"), "Inactive");

    if(email == "")
    {
        info "Skipped: no email on contact " + recordId;
        return;
    }

    // ========= 3) Shared Secret + Base URL =========
    // Store these in Zoho Org Variables
    secret = zoho.crm.getOrgVariable("PORTAL_WEBHOOK_SECRET");
    portalBaseUrl = zoho.crm.getOrgVariable("PORTAL_BASE_URL"); // e.g. https://your-portal.com

    if(secret == "" || portalBaseUrl == "")
    {
        info "Missing PORTAL_WEBHOOK_SECRET or PORTAL_BASE_URL org variable";
        return;
    }

    headers = Map();
    headers.put("Authorization", "Bearer " + secret);
    headers.put("Content-Type", "application/json");

    // ========= 4) Active -> Provision/Enable =========
    if(portalAccess == "Active")
    {
        payload = Map();
        payload.put("email", email);
        payload.put("tempPassword", password);
        payload.put("firstName", firstName);
        payload.put("lastName", lastName);
        payload.put("phone", ifnull(record.get("Phone"), ""));
        payload.put("mobile", ifnull(record.get("Mobile"), ""));
        payload.put("zohoContactId", record.get("id"));

        provisionResp = invokeurl
        [
            url: portalBaseUrl + "/api/admin/create-user"
            type: POST
            parameters: payload.toString()
            headers: headers
        ];

        // Store hash in CRM field (never plaintext at rest)
        tempPwdHash = sha256(password);
        updateMap = Map();
        updateMap.put("Temporary_Password", tempPwdHash);
        updateMap.put("Needs_Password_Change", true);
        zoho.crm.updateRecord("Contacts", recordId, updateMap);

        sendmail
        [
            from: zoho.loginuserid
            to: email
            subject: "Your visa portal login details"
            message: "Hello " + fullName + ",<br><br>"
                + "Your portal account is ready.<br><br>"
                + "<b>Login:</b> " + email + "<br>"
                + "<b>Temporary Password:</b> " + password + "<br><br>"
                + "Please login at <a href='" + portalBaseUrl + "/login'>" + portalBaseUrl + "/login</a> "
                + "and change your password immediately.<br><br>"
                + "Thanks,<br>Support Team"
        ];
    }
    // ========= 5) Inactive -> Revoke =========
    else if(portalAccess == "Inactive")
    {
        revokePayload = Map();
        revokePayload.put("email", email);
        revokePayload.put("zohoContactId", record.get("id"));

        revokeResp = invokeurl
        [
            url: portalBaseUrl + "/api/admin/revoke-access"
            type: POST
            parameters: revokePayload.toString()
            headers: headers
        ];

        clearMap = Map();
        clearMap.put("Temporary_Password", "");
        clearMap.put("Password_Reset_Token", "");
        clearMap.put("Needs_Password_Change", true);
        zoho.crm.updateRecord("Contacts", recordId, clearMap);
    }
}
```

## Hardening Test Checklist

- Active contact can log in and lands in protected route.
- Inactive contact gets denied even with valid Firebase credentials.
- Newly activated contact with temp password is forced to `/change-password`.
- Successful password change clears:
  - `Needs_Password_Change`
  - `Temporary_Password`
  - `Password_Reset_Token`
- Forgot-password issues reset link only for active contacts.
- Reset token is one-time use (second use fails).
- Revoke-access endpoint disables Firebase user and revokes refresh tokens.
- Session expires after 30 days in `authStore.checkSession()`.
