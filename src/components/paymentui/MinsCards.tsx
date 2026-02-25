//MinsCards.tsx 
import type { MayaMins } from "../../types";
interface Props {
    tier: MayaMins;
    selected: boolean;
    onSelect: () => void;
  }
  
  const MinsCards: React.FC<Props> = ({ tier, selected, onSelect }) => {
    return (
      <button
        onClick={onSelect}
        className={`p-5 rounded-2xl border-2 transition-all text-left relative ${
          selected
            ? "border-indigo-600 bg-white shadow-lg"
            : "border-white bg-white shadow-sm hover:border-indigo-100"
        }`}
      >
        {tier.popular && (
          <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-0.5 text-[8px] font-black uppercase rounded-bl-lg tracking-widest">
            Best
          </div>
        )}
  
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-black text-gray-900">
            {tier.price}
          </span>
        </div>
  
        <h3 className="text-base font-black mb-1">
          {tier.title}
        </h3>
  
        <p className="text-xs text-gray-400">
          {tier.description}
        </p>
      </button>
    );
  };
  
  export default MinsCards;