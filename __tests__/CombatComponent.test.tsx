import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { CombatComponent } from '../components/CombatComponent';

describe('CombatComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders attack button and calls onVictory when enemy HP reaches zero', () => {
    const onVictory = jest.fn();
    const onEnd = jest.fn();
    const setPlayerHp = jest.fn();

    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      ReactDOM.createRoot(container).render(
        <CombatComponent
          playerHp={30}
          setPlayerHp={setPlayerHp}
          enemyLevel={0}
          playerLevel={10}
          buffStats={{ strength: 20 }}
          onVictory={onVictory}
          onEnd={onEnd}
        />
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(onVictory).toHaveBeenCalled();
  });
});
