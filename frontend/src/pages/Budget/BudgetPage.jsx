import { useState } from 'react';
import Stepper from '../../components/Stepper';
import IncomeStep from './IncomeStep';
import AnnualBudgetStep from './AnnualBudgetStep';
import FixedMonthlyStep from './FixedMonthlyStep';
import GuiltFreeStep from './GuiltFreeStep';
import SummaryStep from './SummaryStep';
import BudgetVisuals from './BudgetVisuals';
import { useIncome } from '../../hooks/useIncome';
import { useBudget } from '../../hooks/useBudget';
import LoadingSpinner from '../../components/LoadingSpinner';

const STEPS = ['Income', 'Annual Budget', 'Fixed Monthly', 'Guilt-Free Budget', 'Summary'];

export default function BudgetPage() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const { loading: incomeLoading } = useIncome();
  const { loading: budgetLoading } = useBudget();

  if (incomeLoading || budgetLoading) {
    return <LoadingSpinner />;
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <IncomeStep onNext={handleNext} />;
      case 1:
        return <AnnualBudgetStep onNext={handleNext} />;
      case 2:
        return <FixedMonthlyStep onNext={handleNext} />;
      case 3:
        return <GuiltFreeStep onNext={handleNext} />;
      case 4:
        return <SummaryStep />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Chart at top */}
      {currentStep < 4 && <BudgetVisuals currentStep={currentStep} />}

      <div className="bg-white border border-gray-100 rounded-xl px-6 py-5">
        <Stepper steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        {renderStep()}
      </div>
    </div>
  );
}
