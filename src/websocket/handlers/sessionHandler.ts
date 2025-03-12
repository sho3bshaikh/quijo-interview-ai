export class SessionHandler {
  private static instance: SessionHandler;

  private constructor() {}

  static getInstance(): SessionHandler {
    if (!SessionHandler.instance) {
      SessionHandler.instance = new SessionHandler();
    }
    return SessionHandler.instance;
  }

  handleStartMessage(ws: any, questions: any[]): void {
    ws.send(JSON.stringify({
      type: 'start',
      data: questions
    }));
  }

  handleError(ws: any, message: string): void {
    ws.send(JSON.stringify({
      type: 'error',
      data: message
    }));
  }
} 