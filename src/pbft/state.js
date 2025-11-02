export const pbftState = { prepare: [], commit: [], blockHeight: 0 };

export function updatePBFTState(topic, payload) {
  if (topic.endsWith("prepare")) pbftState.prepare.push(payload);
  if (topic.endsWith("commit")) pbftState.commit.push(payload);
  if (pbftState.commit.length >= 2) pbftState.blockHeight++;
}
