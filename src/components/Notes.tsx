/** Renders notes text, turning http(s) URLs into links. */
export function Notes({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <p className="mt-0.5 text-sm break-words whitespace-pre-line text-slate-500 dark:text-slate-400">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  )
}
