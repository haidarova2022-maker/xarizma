import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/bookings',
})
export class BookingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBranch')
  handleJoinBranch(@ConnectedSocket() client: Socket, @MessageBody() branchId: number) {
    client.join(`branch:${branchId}`);
    return { event: 'joined', data: branchId };
  }

  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(@ConnectedSocket() client: Socket, @MessageBody() branchId: number) {
    client.leave(`branch:${branchId}`);
  }

  notifyBookingChange(branchId: number, booking: any) {
    this.server.to(`branch:${branchId}`).emit('bookingChanged', booking);
  }

  notifyBookingCreated(branchId: number, booking: any) {
    this.server.to(`branch:${branchId}`).emit('bookingCreated', booking);
  }

  notifyBookingCancelled(branchId: number, bookingId: number) {
    this.server.to(`branch:${branchId}`).emit('bookingCancelled', { id: bookingId });
  }
}
