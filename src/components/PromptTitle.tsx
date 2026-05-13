import { useEffect, useState } from "react";

const AGENTS = [
  {
    name: "Claude",
    gradient: "linear-gradient(135deg, #ffc098 0%, #d97757 55%, #b3431f 100%)",
  },
  {
    name: "Cursor",
    gradient: "linear-gradient(135deg, #7aa6ff 0%, #b58bff 50%, #f48cb6 100%)",
  },
  {
    name: "Codex",
    gradient: "linear-gradient(135deg, #5eead4 0%, #4ec5e3 50%, #8b5cf6 100%)",
  },
  {
    name: "Gemini",
    gradient: "linear-gradient(135deg, #4285f4 0%, #9b72cb 50%, #d96570 100%)",
  },
];

const HOLD_MS = 2200;
const FADE_MS = 240;

export default function PromptTitle() {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let outTimer = 0;
    let inTimer = 0;

    const cycle = () => {
      setVisible(false);
      outTimer = window.setTimeout(() => {
        setI((prev) => (prev + 1) % AGENTS.length);
        setVisible(true);
        inTimer = window.setTimeout(cycle, HOLD_MS);
      }, FADE_MS);
    };

    inTimer = window.setTimeout(cycle, HOLD_MS);

    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(inTimer);
    };
  }, []);

  const agent = AGENTS[i];

  return (
    <h2 className="kicker prompt-title">
      Try this prompt with{" "}
      <span
        className={`prompt-title__agent ${visible ? "is-visible" : ""}`}
        style={{ backgroundImage: agent.gradient }}
      >
        {agent.name}
      </span>
    </h2>
  );
}
