/**
 * Firestore Chat Service
 * 
 * Handles chat message operations using Firestore.
 * Messages are stored in a flat collection with userId for querying.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';

const MESSAGES_COLLECTION = 'messages';

/**
 * Send a new message
 * @param {Object} messageData - Message data
 * @param {string} messageData.userId - User ID
 * @param {string} messageData.senderType - 'client' or 'agent'
 * @param {string} messageData.senderUid - Firebase Auth UID
 * @param {string} messageData.senderName - Display name
 * @param {string} messageData.body - Message text
 * @param {string} [messageData.matterId] - Optional matter/application ID
 * @returns {Promise<Object>} Created message object
 */
export async function sendMessage(messageData) {
  try {
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

    const messageRef = collection(db, MESSAGES_COLLECTION);
    const newMessage = {
      id: nanoid(),
      userId,
      senderType,
      senderUid,
      senderName,
      body: body.trim(),
      status: 'sent',
      createdAt: serverTimestamp(),
      ...(matterId && { matterId }),
    };

    const docRef = await addDoc(messageRef, newMessage);
    
    // Return message with Firestore timestamp converted to ISO string
    return {
      id: docRef.id,
      ...newMessage,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Fetch messages for a user
 * @param {Object} options - Query options
 * @param {string} options.userId - User ID to fetch messages for
 * @param {string} [options.matterId] - Optional matter ID filter
 * @param {number} [options.limitCount=30] - Number of messages to fetch
 * @param {string} [options.before] - ISO timestamp to fetch messages before
 * @param {string} [options.after] - ISO timestamp to fetch messages after
 * @returns {Promise<Object>} Object with messages array and pagination info
 */
export async function fetchMessages({
  userId,
  matterId,
  limitCount = 30,
  before,
  after,
}) {
  try {
    if (!userId) {
      throw new Error('UserId is required');
    }

    const messagesRef = collection(db, MESSAGES_COLLECTION);
    
    // Always order by createdAt descending for consistency (newest first)
    // Then we'll reverse if needed for ascending order
    let q = query(
      messagesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Handle pagination with date filters (must come after orderBy)
    if (before) {
      const beforeDate = Timestamp.fromDate(new Date(before));
      q = query(q, where('createdAt', '<', beforeDate));
    } else if (after) {
      const afterDate = Timestamp.fromDate(new Date(after));
      q = query(q, where('createdAt', '>', afterDate));
    }

    // Apply limit
    q = query(q, limit(limitCount));
    
    // Note: We can't filter by matterId in the same query without a composite index
    // So we'll filter in memory after fetching

    const snapshot = await getDocs(q);
    let messages = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString();

      messages.push({
        id: docSnap.id,
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
    
    // Filter by matterId in memory if needed (since we can't have multiple where clauses without composite index)
    if (matterId) {
      messages = messages.filter(msg => msg.matterId === matterId);
    }

    // Sort by createdAt ascending for chat view (always sort ascending regardless of query order)
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
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Mark messages as seen
 * @param {string[]} messageIds - Array of message IDs to mark as seen
 * @returns {Promise<number>} Number of messages updated
 */
export async function markMessagesSeen(messageIds) {
  try {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return 0;
    }

    const updatePromises = messageIds.map(async (messageId) => {
      const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
      await updateDoc(messageRef, {
        status: 'seen',
      });
    });

    await Promise.all(updatePromises);
    return messageIds.length;
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    throw error;
  }
}

