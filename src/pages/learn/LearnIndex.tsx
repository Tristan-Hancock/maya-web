import SEO from "../../components/seo/seo";
export default function LearnIndex() {
  return (
    <>
      <SEO
        title="Learn About PCOS, Menstrual Health & How You Feel"
        description="Educational articles about PCOS, menstrual health, and emotional wellbeing — written to help you understand what you're experiencing."
        canonical="https://mayaovelia.com/learn"
      />

      <h1 className="text-3xl font-semibold mb-4">Learn</h1>
      <ul className="mt-6 space-y-2">
  <li>
    <a href="/learn/feelings" className="text-blue-600 underline">
      Feelings & Emotional Health
    </a>
  </li>
  <li>
    <a href="/learn/menstrual-health" className="text-blue-600 underline">
      Menstrual Health
    </a>
  </li>
  <li>
    <a href="/learn/pcos" className="text-blue-600 underline">
      PCOS Education
    </a>
  </li>
</ul>

    </>
  );
}
