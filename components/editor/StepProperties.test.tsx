import { fireEvent, render, screen } from '@testing-library/react';
import StepProperties from './StepProperties';
import { Step } from '@/lib/types';

describe('StepProperties', () => {
  it('updates title and content fields', () => {
    const onUpdate = vi.fn();

    const step: Step = {
      id: 'step-1',
      orderIndex: 1,
      title: 'Ancien titre',
      content: 'Ancien contenu',
      position: 'BOTTOM',
      action: 'NEXT',
      skipAllowed: true,
      highlightElement: false,
      targetSelector: '#btn',
    };

    render(<StepProperties step={step} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByLabelText('Titre'), {
      target: { value: 'Nouveau titre' },
    });

    fireEvent.change(screen.getByLabelText('Contenu'), {
      target: { value: 'Nouveau contenu' },
    });

    expect(onUpdate).toHaveBeenCalled();
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as Step;
    expect(lastCall.title).toBe('Nouveau titre');
    expect(lastCall.content).toBe('Nouveau contenu');
  });

  it('shows empty state when no step is selected', () => {
    render(<StepProperties step={null} onUpdate={vi.fn()} />);

    expect(screen.getByText(/Aucune étape sélectionnée/i)).toBeInTheDocument();
  });
});
