import { REACTION_TYPES } from "@/lib/types";

type ReactionPickerProps = {
    myReaction: string | null | undefined;
    reacting?: boolean;
    countOf: (type: string) => number;
    onReact: (type: string) => void;
    // Restricts the picker to a subset of emoji.
    allowedTypes?: readonly string[];
    // Which edge of the relatively-positioned parent to align to.
    align?: "left" | "right";
};

export default function ReactionPicker({
    myReaction,
    reacting = false,
    countOf,
    onReact,
    allowedTypes,
    align = "left",
}: ReactionPickerProps) {
    const types = allowedTypes ?? REACTION_TYPES;
    return (
        <div className={`absolute z-20 bottom-full mb-1.5 ${align === "right" ? "right-0" : "left-0"} bg-white border border-[#6699cc] p-1.5 flex flex-row flex-nowrap gap-1 shadow-lg max-w-[calc(100vw-2rem)] overflow-x-auto`}>
            {types.map((type) => (
                <button
                    key={type}
                    type="button"
                    className={`text-[18px] leading-none px-1 py-0.5 border cursor-pointer hover:bg-[#dbe9f7] ${
                        myReaction === type
                            ? "border-[#6699cc] bg-[#dbe9f7]"
                            : "border-transparent"
                    }`}
                    onClick={() => onReact(type)}
                    disabled={reacting}
                    title={`${type}${countOf(type) > 0 ? ` (${countOf(type)})` : ""}`}
                >
                    {type}
                </button>
            ))}
        </div>
    );
}
