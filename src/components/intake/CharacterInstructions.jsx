import { CHARACTER_INSTRUCTIONS } from "@/lib/allApplicantsParity";
import { QuestionnaireCopyText } from "@/components/questionnaire/QuestionnaireCopyContext";

export function CharacterInstructions() {
  return (
    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
      {CHARACTER_INSTRUCTIONS.map((block, index) => block.type === "list" ? (
        <div key={index}>
          <QuestionnaireCopyText as="p">{block.lead}</QuestionnaireCopyText>
          <ul className="list-disc space-y-1 pl-5">
            {block.items.map((item) => <QuestionnaireCopyText as="li" key={item}>{item}</QuestionnaireCopyText>)}
          </ul>
        </div>
      ) : <QuestionnaireCopyText as="p" key={index}>{block.text}</QuestionnaireCopyText>)}
    </div>
  );
}
