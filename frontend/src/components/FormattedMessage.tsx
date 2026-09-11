import React from "react";

function parseWhatsAppFormatting(text: string): React.ReactNode[] {
  const regex = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const content = match[0];
    if (content.startsWith("*") && content.endsWith("*")) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {content.slice(1, -1)}
        </strong>
      );
    } else if (content.startsWith("_") && content.endsWith("_")) {
      parts.push(
        <em key={match.index} className="italic">
          {content.slice(1, -1)}
        </em>
      );
    } else if (content.startsWith("~") && content.endsWith("~")) {
      parts.push(
        <span key={match.index} className="line-through opacity-70">
          {content.slice(1, -1)}
        </span>
      );
    } else if (content.startsWith("`") && content.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-foreground/10 text-[13px] font-mono"
        >
          {content.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(content);
    }

    lastIndex = match.index + content.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {parseWhatsAppFormatting(line)}
        </span>
      ))}
    </>
  );
}
