import { CHARACTER_INSTRUCTIONS } from "@/lib/allApplicantsParity";

export function CharacterInstructions() {
  return (
    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
      {CHARACTER_INSTRUCTIONS.map((block, index) => block.type === "list" ? (
        <div key={index}>
          <p>{block.lead}</p>
          <ul className="list-disc space-y-1 pl-5">
            {block.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : <p key={index}>{block.text}</p>)}
    </div>
  );
}
