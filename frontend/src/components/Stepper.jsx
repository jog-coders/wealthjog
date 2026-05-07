export default function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex flex-wrap gap-2 md:gap-0 md:flex-nowrap">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <li key={step} className="flex-1 min-w-[6rem]">
              <button
                onClick={() => onStepClick(index)}
                className={`group flex flex-col border-t-2 pt-3 pb-1 w-full text-left transition-colors ${
                  isActive || isCompleted
                    ? 'border-primary-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`text-xs font-medium mb-0.5 ${
                  isActive ? 'text-primary-500' : isCompleted ? 'text-primary-400' : 'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Done
                    </span>
                  ) : `Step ${index + 1}`}
                </span>
                <span className={`text-sm font-semibold ${
                  isActive ? 'text-gray-900' : isCompleted ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {step}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
