type Block = { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };

/** Lines starting with "- " become a bullet list, "1. " a numbered list, anything else a paragraph. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    const bullet = /^- (.*)/.exec(line)?.[1];
    const numbered = /^\d+\. (.*)/.exec(line)?.[1];
    const item = bullet ?? numbered;
    if (item === undefined) {
      blocks.push({ kind: 'p', text: line });
      continue;
    }
    const kind = bullet !== undefined ? 'ul' : 'ol';
    const last = blocks.at(-1);
    if (last && last.kind === kind) last.items.push(item);
    else blocks.push({ kind, items: [item] });
  }
  return blocks;
}

export default function Description({ text }: { text: string }) {
  return (
    <div className="description">
      {toBlocks(text).map((block, i) => {
        if (block.kind === 'p') return <p key={i}>{block.text}</p>;
        const List = block.kind;
        return (
          <List key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
