import type { UIMessage } from 'ai';
import { windowMessages } from '../../src/lib/agent/memory/window';

export function longHistory(fact: string, question: string, turns: number) {
  const history: UIMessage[] = [];
  for (let turn = 0; turn < turns; turn++) {
    const text = turn === 5 ? fact : `I completed interview practice session ${turn + 1}.`;
    history.push(
      { id: `u${turn}`, role: 'user', parts: [{ type: 'text', text }] },
      { id: `a${turn}`, role: 'assistant', parts: [{ type: 'text', text: 'Understood.' }] },
    );
  }
  history.push({ id: 'question', role: 'user', parts: [{ type: 'text', text: question }] });
  return windowMessages(history).map(({ role, parts }) => ({
    role,
    content: parts[0].type === 'text' ? parts[0].text : '',
    ...(role === 'assistant' && { reasoning_content: '' }),
  }));
}
