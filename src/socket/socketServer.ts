import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { messageService } from '../services/MessageService';
import { userService } from '../services/UserService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let ioInstance: Server | null = null;

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};

export const initializeSocketServer = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Store user-socket mappings
  const userSockets = new Map<string, string>();

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string };
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId}`);

    // Store socket mapping
    userSockets.set(userId, socket.id);
    socket.join(userId);

    // Update user online status
    await userService.setOnlineStatus(userId, true);

    // Broadcast online status to all clients
    io.emit('user_status_changed', { userId, isOnline: true });

    // Handle direct messages
    socket.on('send_direct_message', async (data: { recipientId: string; content: string }) => {
      try {
        const message = await messageService.sendDirectMessage(
          userId,
          data.recipientId,
          data.content
        );

        // Send confirmation to sender
        socket.emit('message_received', message);

        // Send to recipient if online
        const recipientSocketId = userSockets.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message_received', message);
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle group messages
    socket.on('send_group_message', async (data: { groupId: string; content: string }) => {
      try {
        const message = await messageService.sendGroupMessage(
          userId,
          data.groupId,
          data.content
        );

        // Fetch group members to broadcast to
        const group = await mongoose.model('Group').findById(data.groupId);
        if (group) {
          group.memberIds.forEach((memberId: any) => {
            const memberSocketId = userSockets.get(memberId.toString());
            if (memberSocketId) {
              io.to(memberSocketId).emit('message_received', message);
            }
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle mark as read
    socket.on('mark_as_read', async (data: { conversationId: string }) => {
      try {
        await messageService.markAsRead(data.conversationId, userId);
        
        // Notify other devices of the same user if needed (in a multi-device setup)
        // For now, we don't have multi-socket per user tracking besides userSockets Map (which holds one)
        // But we can emit back to the sender to confirm or if we had a set of sockets
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        const recipientSocketId = userSockets.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing_start', { userId, conversationId: userId });
        }
      } else if (data.groupId) {
        socket.broadcast.emit('typing_start', { userId, conversationId: data.groupId });
      }
    });

    socket.on('typing_stop', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        const recipientSocketId = userSockets.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing_stop', { userId, conversationId: userId });
        }
      } else if (data.groupId) {
        socket.broadcast.emit('typing_stop', { userId, conversationId: data.groupId });
      }
    });

    // Handle clear chat
    socket.on('chat_cleared', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        const recipientSocketId = userSockets.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('chat_cleared', { userId, conversationId: userId });
        }
      } else if (data.groupId) {
        socket.broadcast.emit('chat_cleared', { userId, conversationId: data.groupId });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);

      // Remove socket mapping
      userSockets.delete(userId);

      // Update user online status
      await userService.setOnlineStatus(userId, false);

      // Broadcast offline status
      io.emit('user_status_changed', { userId, isOnline: false });
    });
  });

  // Heartbeat mechanism
  setInterval(() => {
    io.emit('ping');
  }, 30000);

  ioInstance = io;
  return io;
};
