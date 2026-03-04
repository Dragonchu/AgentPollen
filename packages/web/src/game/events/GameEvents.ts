export enum GameEvents {
  CAMERA_FOLLOW_PLAYER = 'camera-follow-player',
}

export enum PointerEvents {
  POINTER_DOWN = 'pointerdown',
}

export enum SocketEvents {
  CONNECTED = 'connect',
  DISCONNECTED = 'disconnect',
  SYNC_FULL = 'sync:full',
  SYNC_WORLD = 'sync:world',
  SYNC_AGENTS = 'sync:agents',
  SYNC_EVENTS = 'sync:events',
  VOTE_STATE = 'vote:state',
  AGENT_DETAIL = 'agent:detail',
  THINKING_HISTORY = 'thinking:history',
  SYNC_PATHS = 'sync:paths',
  VOTE_SUBMIT = 'vote:submit',
  AGENT_INSPECT = 'agent:inspect',
  AGENT_FOLLOW = 'agent:follow',
  THINKING_REQUEST = 'thinking:request',
}

export enum NetworkEvents {
  CONNECTED = 'network:connected',
  DISCONNECTED = 'network:disconnected',
  SYNC_FULL = 'network:sync:full',
  SYNC_WORLD = 'network:sync:world',
  SYNC_AGENTS = 'network:sync:agents',
  SYNC_EVENTS = 'network:sync:events',
  VOTE_STATE = 'network:vote:state',
  AGENT_DETAIL = 'network:agent:detail',
  THINKING_HISTORY = 'network:thinking:history',
  SYNC_PATHS = 'network:sync:paths',
  AGENT_INSPECT = 'network:agent:inspect',
  AGENT_CLEAR_SELECTION = 'network:agent:clear-selection',
}
