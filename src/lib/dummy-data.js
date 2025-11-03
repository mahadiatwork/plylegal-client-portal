import { applicationsStore, appDataStore } from "@/stores";

// Demo applications data
export const demoApplications = [
  {
    id: "app-001",
    reference: "APP-0001",
    type: "Partner Visa (309/100)",
    status: "Active",
    updated: "2025-09-01",
    created: "2025-08-15",
  },
  {
    id: "app-002",
    reference: "APP-0002",
    type: "Visitor Visa (600)",
    status: "Draft",
    updated: "2025-08-20",
    created: "2025-08-20",
  },
];

// Initialize applications list with demo data if empty
export function initializeApplicationsList() {
  const apps = applicationsStore.applications;
  if (apps.length === 0) {
    demoApplications.forEach(app => {
      applicationsStore.createApplication(app);
    });
  }
}

// Demo uploads
const demoUploads = [
  {
    id: "upload-1",
    name: "Passport biodata page",
    status: "Pending",
  },
  {
    id: "upload-2",
    name: "Birth certificate",
    status: "Uploaded",
    uploadedAt: "2025-08-25",
  },
  {
    id: "upload-3",
    name: "Police clearance",
    status: "Verified",
    uploadedAt: "2025-08-26",
  },
];

// Demo tasks
const demoTasks = [
  {
    id: "task-1",
    title: "Complete health examination",
    done: false,
  },
  {
    id: "task-2",
    title: "Submit police clearance",
    done: true,
  },
  {
    id: "task-3",
    title: "Provide relationship evidence",
    done: false,
  },
];

// Demo deliverables
const demoDeliverables = [
  {
    id: "deliv-1",
    item: "Application form",
    description: "Completed visa application form",
    status: "Completed",
  },
  {
    id: "deliv-2",
    item: "Cover letter",
    description: "Supporting cover letter for your application",
    status: "In progress",
  },
  {
    id: "deliv-3",
    item: "Document checklist",
    description: "Comprehensive list of required documents",
    status: "Pending",
  },
];

// Demo messages
const demoMessages = [
  {
    id: "msg-1",
    from: "plylegal",
    subject: "Welcome to your application portal",
    text: "We're here to help guide you through your visa application process. Please upload your documents at your earliest convenience.",
    date: "2025-08-15",
  },
  {
    id: "msg-2",
    from: "client",
    subject: "Question about documents",
    text: "Do I need to provide certified copies of all documents?",
    date: "2025-08-18",
  },
  {
    id: "msg-3",
    from: "plylegal",
    subject: "Re: Question about documents",
    text: "Yes, all documents must be certified copies. We recommend using a Justice of the Peace or similar authority.",
    date: "2025-08-19",
  },
];

// Initialize app data for a specific application
export function initializeAppData(appId) {
  // Initialize uploads if empty
  const uploads = appDataStore.loadUploads(appId);
  if (uploads.length === 0) {
    appDataStore.saveUploads(appId, demoUploads);
  }
  
  // Initialize tasks if empty
  const tasks = appDataStore.loadTasks(appId);
  if (tasks.length === 0) {
    appDataStore.saveTasks(appId, demoTasks);
  }
  
  // Initialize deliverables if empty
  const deliverables = appDataStore.loadDeliverables(appId);
  if (deliverables.length === 0) {
    appDataStore.saveDeliverables(appId, demoDeliverables);
  }
  
  // Initialize messages if empty
  const messages = appDataStore.loadMessages(appId);
  if (messages.length === 0) {
    appDataStore.saveMessages(appId, demoMessages);
  }
}
