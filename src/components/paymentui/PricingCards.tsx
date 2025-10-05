
// import React, { useState } from 'react';
// import { } from '../../types';
// import { CheckIcon } from '../../components/icons/sidebaricons';

// interface PricingCardProps {
// }

// const PricingCard: React.FC<PricingCardProps> = ({  }) => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);

//   const handleSubscription = () => {
//     setIsLoading(true);
//     // Mock AWS API call
//     setTimeout(() => {
//       setIsLoading(false);
//       setIsSuccess(true);
//     }, 1500);
//   };
    
//   const ctaClasses = `mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full transition-colors ${
//     tier.isPopular ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600' : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline-indigo-600'
//   }`;

//   const renderButtonContent = () => {
//     if (isLoading) {
//       return (
//         <div className="flex justify-center items-center">
//           <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//           </svg>
//           Processing...
//         </div>
//       );
//     }
//     if (isSuccess) {
//       return 'Subscribed!';
//     }
//     return tier.cta;
//   };

//   return (
//     <div className={`flex flex-col justify-between rounded-3xl p-8 ring-1 xl:p-10 ${tier.isPopular ? 'bg-gray-900 ring-gray-900' : 'bg-white ring-gray-200'}`}>
//         <div>
//             <div className="flex items-center justify-between gap-x-4">
//                 <h3 className={`text-lg font-semibold leading-8 ${tier.isPopular ? 'text-white' : 'text-gray-900'}`}>{tier.name}</h3>
//                 {tier.isPopular && <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-400">Most popular</p>}
//             </div>
//             <p className="mt-4 text-sm leading-6 text-gray-600">A plan that's right for you.</p>
//             <p className="mt-6 flex items-baseline gap-x-1">
//                 <span className={`text-4xl font-bold tracking-tight ${tier.isPopular ? 'text-white' : 'text-gray-900'}`}>{tier.price}</span>
//                 {tier.priceAnnotation && <span className={`text-sm font-semibold leading-6 ${tier.isPopular ? 'text-gray-300' : 'text-gray-600'}`}>{tier.priceAnnotation}</span>}
//             </p>
//             <ul role="list" className={`mt-8 space-y-3 text-sm leading-6 ${tier.isPopular ? 'text-gray-300' : 'text-gray-600'}`}>
//                 {tier.features.map((feature) => (
//                     <li key={feature} className="flex gap-x-3">
//                         <CheckIcon className={`h-6 w-5 flex-none ${tier.isPopular ? 'text-white' : 'text-indigo-600'}`} aria-hidden="true" />
//                         {feature}
//                     </li>
//                 ))}
//             </ul>
//         </div>
//         <button
//             onClick={handleSubscription}
//             disabled={isLoading || isSuccess}
//             className={`${ctaClasses} ${isSuccess ? 'bg-green-500 hover:bg-green-500 cursor-default text-white' : ''} disabled:opacity-70`}
//         >
//             {renderButtonContent()}
//         </button>
//     </div>
//   );
// };

// export default PricingCard;
