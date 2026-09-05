import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    path: "/api/socket",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    const branchId = socket.handshake.query.branchId as string;
    const tableId = socket.handshake.query.tableId as string;
    const role = socket.handshake.query.role as string;

    if (branchId) {
      socket.join(`branch-${branchId}`);
      if (role === "KITCHEN") socket.join(`kitchen-${branchId}`);
      if (role === "CASHIER" || role === "MANAGER")
        socket.join(`counter-${branchId}`);
    }

    if (tableId) {
      socket.join(`table-${tableId}`);
    }

    socket.on("order:new", (data) => {
      if (branchId) {
        io?.to(`kitchen-${branchId}`).emit("order:new", data);
        io?.to(`counter-${branchId}`).emit("order:new", data);
        io?.to(`table-${data.tableId}`).emit("order:status", data);
      }
    });

    socket.on("order:status", (data) => {
      const { tableId: tId, branchId: bId } = data;
      if (bId) {
        io?.to(`kitchen-${bId}`).emit("order:status", data);
        io?.to(`counter-${bId}`).emit("order:status", data);
      }
      if (tId) {
        io?.to(`table-${tId}`).emit("order:status", data);
      }
    });

    socket.on("waiter:called", (data) => {
      if (branchId) {
        io?.to(`counter-${branchId}`).emit("waiter:called", data);
      }
    });

    socket.on("bill:requested", (data) => {
      if (branchId) {
        io?.to(`counter-${branchId}`).emit("bill:requested", data);
      }
    });

    socket.on("water:requested", (data) => {
      if (branchId) {
        io?.to(`counter-${branchId}`).emit("water:requested", data);
      }
    });

    socket.on("table:updated", (data) => {
      if (branchId) {
        io?.to(`counter-${branchId}`).emit("table:updated", data);
      }
    });

    socket.on("kitchen:stats", (data) => {
      if (branchId) {
        io?.to(`kitchen-${branchId}`).emit("kitchen:stats", data);
      }
    });

    socket.on("notification:new", (data) => {
      if (branchId) {
        io?.to(`branch-${branchId}`).emit("notification:new", data);
      }
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically
    });
  });

  return io;
}
