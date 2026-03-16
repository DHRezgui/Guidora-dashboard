import { fireEvent, render, screen } from '@testing-library/react';
import StepCanvas from './StepCanvas';
import { Step } from '@/lib/types';

function renderCanvas(steps: Step[] = []) {
  const onStepsChange = vi.fn();
  const onSelectStep = vi.fn();

  render(
    <StepCanvas
      tour={{ id: 'tour-1', name: 'Tour test', targetUrl: '/dashboard', steps }}
      steps={steps}
      selectedStep={null}
      onSelectStep={onSelectStep}
      onStepsChange={onStepsChange}
      isPreviewMode={false}
    />
  );

  return { onStepsChange, onSelectStep };
}

describe('StepCanvas', () => {
  it('adds a new step from empty state button', () => {
    const { onStepsChange } = renderCanvas([]);

    fireEvent.click(screen.getByTestId('add-step-empty-btn'));

    expect(onStepsChange).toHaveBeenCalledTimes(1);
    const nextSteps = onStepsChange.mock.calls[0][0] as Step[];
    expect(nextSteps).toHaveLength(1);
    expect(nextSteps[0].title).toBe('Nouvelle étape');
  });

  it('adds a step on drop from palette payload', () => {
    const { onStepsChange } = renderCanvas([]);

    const dropArea = screen.getByTestId('step-canvas-dropzone');

    fireEvent.drop(dropArea, {
      dataTransfer: {
        getData: () =>
          JSON.stringify({
            title: 'Step depuis palette',
            content: 'Contenu test',
            position: 'BOTTOM',
            action: 'NEXT',
          }),
      },
    });

    expect(onStepsChange).toHaveBeenCalled();
    const nextSteps = onStepsChange.mock.calls[0][0] as Step[];
    expect(nextSteps[0].title).toBe('Step depuis palette');
  });

  it('deletes a step from the list', () => {
    const steps: Step[] = [
      {
        id: 'step-1',
        orderIndex: 1,
        title: 'Etape 1',
        content: 'Contenu',
        position: 'BOTTOM',
        action: 'NEXT',
        skipAllowed: true,
        highlightElement: false,
      },
    ];

    const { onStepsChange } = renderCanvas(steps);

    fireEvent.click(screen.getByTitle('Supprimer'));

    expect(onStepsChange).toHaveBeenCalledTimes(1);
    const nextSteps = onStepsChange.mock.calls[0][0] as Step[];
    expect(nextSteps).toHaveLength(0);
  });

  it('reorders steps with move controls', () => {
    const steps: Step[] = [
      {
        id: 'step-1',
        orderIndex: 1,
        title: 'Etape 1',
        content: 'Contenu 1',
        position: 'BOTTOM',
        action: 'NEXT',
        skipAllowed: true,
        highlightElement: false,
      },
      {
        id: 'step-2',
        orderIndex: 2,
        title: 'Etape 2',
        content: 'Contenu 2',
        position: 'BOTTOM',
        action: 'NEXT',
        skipAllowed: true,
        highlightElement: false,
      },
    ];

    const { onStepsChange } = renderCanvas(steps);

    fireEvent.click(screen.getAllByTitle('Monter')[1]);

    expect(onStepsChange).toHaveBeenCalled();
    const reordered = onStepsChange.mock.calls[0][0] as Step[];
    expect(reordered[0].id).toBe('step-2');
    expect(reordered[1].id).toBe('step-1');
  });
});
