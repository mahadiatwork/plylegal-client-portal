/**
 * Firestore Chat Service (Admin SDK)
 * 
 * Server-side chat operations using Firebase Admin SDK.
 * Used in API routes to bypass security rules.
 */

import { db, isAdminSDKInitialized, adminAuth } from './firebase-admin';
import { nanoid } from 'nanoid';

const MESSAGES_COLLECTION = 'messages';

/**
 * Send a new message (Admin SDK)
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message object
 */
export async function sendMessageAdmin(messageData) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      throw new Error('Firebase Admin SDK is not properly initialized');
    }

    const {
      userId,
      senderType,
      senderUid,
      senderName,
      body,
      matterId,
    } = messageData;

    if (!userId || !senderType || !senderUid || !senderName || !body) {
      throw new Error('Missing required message fields');
    }

    const messagesRef = db.collection(MESSAGES_COLLECTION);
    const newMessage = {
      id: nanoid(),
      userId,
      senderType,
      senderUid,
      senderName,
      body: body.trim(),
      status: 'sent',
      createdAt: new Date(),
      ...(matterId && { matterId }),
    };

    const docRef = await messagesRef.add(newMessage);
    
    return {
      id: docRef.id,
      ...newMessage,
      createdAt: newMessage.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('Error sending message (Admin SDK):', error);
    throw error;
  }
}

/**
 * Fetch messages for a user (Admin SDK)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Object with messages array and pagination info
 */
export async function fetchMessagesAdmin({
  userId,
  matterId,
  limitCount = 30,
  before,
  after,
}) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      throw new Error('Firebase Admin SDK is not properly initialized');
    }

    if (!userId) {
      throw new Error('UserId is required');
    }

    // Build query - start with userId filter
    let messagesQuery = db.collection(MESSAGES_COLLECTION)
      .where('userId', '==', userId);

    // Order by createdAt (required before date filtering)
    messagesQuery = messagesQuery.orderBy('createdAt', before ? 'desc' : 'asc');

    // Handle pagination with date filter
    if (before) {
      const beforeDate = new Date(before);
      messagesQuery = messagesQuery.where('createdAt', '<', beforeDate);
    } else if (after) {
      const afterDate = new Date(after);
      messagesQuery = messagesQuery.where('createdAt', '>', afterDate);
    }

    // Apply limit
    messagesQuery = messagesQuery.limit(limitCount);

    const snapshot = await messagesQuery.get();
    
    // Filter by matterId in memory if needed (since we can't have multiple where clauses without composite index)
    let allMessages = [];
    snapshot.forEach((docSnap) => {
      allMessages.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // Filter by matterId if provided
    if (matterId) {
      allMessages = allMessages.filter(msg => msg.matterId === matterId);
    }
    const messages = [];

    allMessages.forEach((data) => {
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt?.toISOString
        ? data.createdAt.toISOString()
        : data.createdAt instanceof Date
        ? data.createdAt.toISOString()
        : new Date(data.createdAt).toISOString();

      messages.push({
        id: data.id,
        userId: data.userId,
        senderType: data.senderType || 'client',
        senderUid: data.senderUid,
        senderName: data.senderName,
        body: data.body,
        status: data.status || 'sent',
        createdAt,
        matterId: data.matterId,
      });
    });

    // Sort by createdAt ascending for chat view
    messages.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });

    const hasMore = messages.length === limitCount;
    const oldestMessage = messages[0];
    const newestMessage = messages[messages.length - 1];

    return {
      messages,
      hasMore,
      olderCursor: oldestMessage?.createdAt || null,
      newestCursor: newestMessage?.createdAt || null,
    };
  } catch (error) {
    console.error('Error fetching messages (Admin SDK):', error);
    throw error;
  }
}

/**
 * Fetch messages by email address (Admin SDK)
 * Resolves email to userId, then fetches messages
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Object with messages array and pagination info
 */
export async function fetchMessagesByEmail({
  email,
  matterId,
  limitCount = 30,
  before,
  after,
}) {
  try {
    if (!isAdminSDKInitialized() || !adminAuth || !db) {
      throw new Error('Firebase Admin SDK is not properly initialized');
    }

    if (!email) {
      throw new Error('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Resolve email to userId
    let userId;
    try {
      const userRecord = await adminAuth.getUserByEmail(normalizedEmail);
      userId = userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Return empty result if user not found (not an error for admin endpoint)
        return {
          messages: [],
          hasMore: false,
          olderCursor: null,
          newestCursor: null,
        };
      }
      throw error;
    }

    // Fetch messages using userId
    return await fetchMessagesAdmin({
      userId,
      matterId,
      limitCount,
      before,
      after,
    });
  } catch (error) {
    console.error('Error fetching messages by email (Admin SDK):', error);
    throw error;
  }
}

/**
 * Mark messages as seen (Admin SDK)
 * @param {string[]} messageIds - Array of message IDs to mark as seen
 * @returns {Promise<number>} Number of messages updated
 */
export async function markMessagesSeenAdmin(messageIds) {
  try {
    if (!isAdminSDKInitialized() || !db) {
      throw new Error('Firebase Admin SDK is not properly initialized');
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return 0;
    }

    const batch = db.batch();
    messageIds.forEach((messageId) => {
      const messageRef = db.collection(MESSAGES_COLLECTION).doc(messageId);
      batch.update(messageRef, {
        status: 'seen',
      });
    });

    await batch.commit();
    return messageIds.length;
  } catch (error) {
    console.error('Error marking messages as seen (Admin SDK):', error);
    throw error;
  }
}
