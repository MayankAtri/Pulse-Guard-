const state = {
  mockHealthy: true,
  mockBody: "healthy",
  slackEvents: [] as Array<{ text?: string; createdAt: string }>
};

export const mockState = {
  get healthy() {
    return state.mockHealthy;
  },
  set healthy(value: boolean) {
    state.mockHealthy = value;
  },
  get body() {
    return state.mockBody;
  },
  set body(value: string) {
    state.mockBody = value;
  },
  pushSlackEvent(event: { text?: string }) {
    state.slackEvents.unshift({ ...event, createdAt: new Date().toISOString() });
    state.slackEvents = state.slackEvents.slice(0, 100);
  },
  listSlackEvents() {
    return state.slackEvents;
  },
  clearSlackEvents() {
    state.slackEvents = [];
  }
};
