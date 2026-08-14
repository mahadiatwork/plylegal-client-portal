import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { requireClient, verifyAuth } from '@/lib/serverAuth';
import { ZohoCRMClient } from '@/lib/zohoClient';
import {
  buildPreviewHeaders,
  createPreviewToken,
  getPreviewCookieName,
  getPreviewCookieOptionsForPath,
  getPreviewTimeoutMs,
  verifyPreviewToken,
} from '@/lib/workdrivePreview';

export const runtime = 'nodejs';

const MODULE = 'Matter_Documents';
const PREVIEW_RESOURCE_ID = 'document-preview';
const MATTER_DOCUMENT_FIELDS = [
  'id',
  'Matter_Document_Name',
  'Document_Name',
  'Name',
  'Document_Status',
  'File_Name',
  'File_Size',
  'document_Serial',
].join(',');

function errorResponse(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

function getDocumentName(document = {}) {
  return document.File_Name ||
    document.file_name ||
    document.Name ||
    document.Matter_Document_Name ||
    document.Document_Name ||
    document.name ||
    'document.pdf';
}

function getAttachmentName(attachment = {}) {
  return attachment.File_Name || attachment.file_name || attachment.name || attachment.Name || '';
}

function isPdfName(name) {
  return /\.pdf$/i.test(String(name || '').trim());
}

function isFileAttachment(attachment = {}) {
  const type = String(attachment.Type || attachment.type || attachment.Attachment_Type || '').toLowerCase();
  return !type || type === 'file';
}

function getAttachmentId(attachment = {}) {
  const id = attachment.id || attachment.ID || attachment.attachment_id;
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
}

async function authenticate(request, matterId) {
  if (request.headers.get('authorization')) {
    const auth = await verifyAuth(request);
    const clientCheck = requireClient(auth);
    return clientCheck.authorized ? auth : { response: errorResponse(clientCheck.error, clientCheck.status) };
  }

  const token = request.cookies?.get(getPreviewCookieName())?.value;
  const auth = verifyPreviewToken(token, { matterId, resourceId: PREVIEW_RESOURCE_ID });
  return auth || { response: errorResponse('Authentication required', 401) };
}

async function resolveDocument(db, auth, matterId, zohoClient, signal) {
  const applicationDoc = await db.collection('applications').doc(matterId).get();
  if (!applicationDoc.exists) return { response: errorResponse('Matter not found', 404) };

  const application = applicationDoc.data() || {};
  if (auth.role !== 'admin' && application.userId !== auth.uid) {
    return { response: errorResponse('Access denied', 403) };
  }
  if (!application.zohoId) return { response: errorResponse('Matter is not linked to Zoho', 404) };

  const documents = await zohoClient.getRelatedRecords(
    'Deals',
    application.zohoId,
    'Matter_Documents',
    MATTER_DOCUMENT_FIELDS,
  );

  const pdfDocuments = documents.filter((item) => (
    isPdfName(getDocumentName(item)) &&
    String(item.Document_Status || '').toLowerCase() !== 'archived'
  ));

  for (const document of pdfDocuments) {
    const attachments = await zohoClient.listAttachments(MODULE, document.id, signal);
    const attachment = attachments.find((item) => (
      isFileAttachment(item) &&
      isPdfName(getAttachmentName(item) || getDocumentName(document))
    ));
    const attachmentId = getAttachmentId(attachment);
    if (attachmentId) {
      return {
        documentId: document.id,
        attachmentId,
        fileName: getAttachmentName(attachment) || getDocumentName(document),
      };
    }
  }

  return { response: errorResponse('PDF attachment is not available', 404) };
}

function requestSignal(request) {
  return AbortSignal.any([request.signal, AbortSignal.timeout(getPreviewTimeoutMs())]);
}

async function getResolvedRequest(request, matterId) {
  const dbResult = getDb();
  if (!dbResult.ok) return { response: errorResponse(dbResult.error, 500) };

  const auth = await authenticate(request, matterId);
  if (auth.response) return auth;

  const signal = requestSignal(request);
  try {
    const resolved = await resolveDocument(dbResult.db, auth, matterId, new ZohoCRMClient(), signal);
    return resolved.response ? resolved : { ...resolved, signal, auth };
  } catch {
    return { response: errorResponse('Unable to load document preview', 502) };
  }
}

export async function POST(request, { params }) {
  const { matterId } = await params;
  if (!matterId) return errorResponse('Matter ID is required', 400);

  const resolved = await getResolvedRequest(request, matterId);
  if (resolved.response) return resolved.response;

  const response = NextResponse.json({ success: true, fileName: resolved.fileName });
  response.cookies.set(
    getPreviewCookieName(),
    createPreviewToken({ uid: resolved.auth?.uid, role: resolved.auth?.role, matterId, resourceId: PREVIEW_RESOURCE_ID }),
    getPreviewCookieOptionsForPath(
      request,
      `/api/matters/${encodeURIComponent(matterId)}/document-preview`,
    ),
  );
  return response;
}

export async function GET(request, { params }) {
  const { matterId } = await params;
  if (!matterId) return errorResponse('Matter ID is required', 400);

  const resolved = await getResolvedRequest(request, matterId);
  if (resolved.response) return resolved.response;

  try {
    const client = new ZohoCRMClient();
    const upstream = await client.downloadAttachment(MODULE, resolved.documentId, resolved.attachmentId, {
      range: request.headers.get('range'),
      signal: resolved.signal,
    });

    if (![200, 206, 416].includes(upstream.status)) {
      upstream.data?.destroy?.();
      return errorResponse('Zoho attachment download failed', 502);
    }

    return new Response(Readable.toWeb(upstream.data), {
      status: upstream.status,
      headers: buildPreviewHeaders({
        filename: resolved.fileName,
        upstreamHeaders: new Headers(Object.entries(upstream.headers).map(([key, value]) => [key, String(value)])),
      }),
    });
  } catch {
    return errorResponse('Unable to preview document', 504);
  }
}
