
// import React from 'react';
// import { Link } from 'react-router-dom';
// import PricingCard from '../../components/paymentui/PricingCards';
// import { SubscriptionTier, Tier } from '../../types';
// import { ArrowLeftIcon } from '../icons/sidebaricons';

// const tiers: Tier[] = [
  
// ];


// const SubscriptionPage: React.FC = () => {
//   return (
//     <div className="min-h-screen bg-gray-50 text-brand-dark">
//       <div className="relative isolate overflow-hidden">
//         <div className="absolute top-0 left-4 p-4 z-10">
//             <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-dark">
//                 <ArrowLeftIcon className="w-5 h-5" />
//                 Back to Chat
//             </Link>
//         </div>
//         <div className="mx-auto max-w-7xl px-6 pb-96 pt-24 text-center sm:pt-32 lg:px-8">
//           <div className="mx-auto max-w-4xl">
//             <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
//             <p className="mt-2 text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">
//               The right plan for you, whoever you are
//             </p>
//           </div>
//           <div className="relative mt-6">
//             <p className="mx-auto max-w-2xl text-lg leading-8 text-gray-600">
//               Choose a plan that fits your needs. Start for free and upgrade anytime.
//             </p>
//           </div>
//         </div>
//         <div className="flow-root bg-white pb-24 sm:pb-32">
//           <div className="-mt-80">
//             <div className="mx-auto max-w-7xl px-6 lg:px-8">
//               <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
//                 {tiers.slice(0, 2).map((tier) => (
//                    <PricingCard key={tier.name} tier={tier} />
//                 ))}
//                 <div className="flex flex-col items-start gap-x-8 gap-y-10 rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10 lg:col-span-2 lg:flex-row lg:items-center">
//                     <div className="lg:min-w-0 lg:flex-1">
//                         <h3 className="text-lg font-semibold leading-8 tracking-tight text-indigo-600">{tiers[2].name}</h3>
//                         <p className="mt-1 text-base leading-7 text-gray-600">
//                            Powerful features for your entire team.
//                         </p>
//                     </div>
//                     <a href="#" className="rounded-md px-3.5 py-2 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
//                         Contact sales <span aria-hidden="true">&rarr;</span>
//                     </a>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SubscriptionPage;
