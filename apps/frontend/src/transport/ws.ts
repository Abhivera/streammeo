import { io } from "socket.io-client";

export const startSession = () => {
  return io("http://localhost:8880");
};
