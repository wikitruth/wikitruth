declare module 'emailjs/email' {
  interface EmailServer {
    send(
      payload: Record<string, unknown>,
      callback: (sendError: unknown, message: unknown) => void
    ): void;
  }
  const emailjs: {
    server: {
      connect(credentials: unknown): EmailServer;
    };
  };
  export default emailjs;
}
