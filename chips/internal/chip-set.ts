/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {html, isServer, LitElement} from 'lit';
import {queryAssignedElements} from 'lit/decorators.js';

import {polyfillElementInternalsAria, setupHostAria} from '../../internal/aria/aria.js';

import {Chip} from './chip.js';

/**
 * A chip set component.
 */
export class ChipSet extends LitElement {
  static {
    setupHostAria(ChipSet, {focusable: false});
  }

  get chips() {
    return this.childElements.filter(
        (child): child is Chip => child instanceof Chip);
  }

  @queryAssignedElements() private readonly childElements!: HTMLElement[];
  private readonly internals = polyfillElementInternalsAria(
      this, (this as HTMLElement /* needed for closure */).attachInternals());

  constructor() {
    super();
    if (!isServer) {
      this.addEventListener('focusin', this.updateTabIndices.bind(this));
      this.addEventListener('update-focus', this.updateTabIndices.bind(this));
      this.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.internals.role = 'toolbar';
    }
  }

  protected override render() {
    return html`<slot @slotchange=${this.updateTabIndices}></slot>`;
  }

  private handleKeyDown(event: KeyboardEvent) {
    const isLeft = event.key === 'ArrowLeft';
    const isRight = event.key === 'ArrowRight';
    const isHome = event.key === 'Home';
    const isEnd = event.key === 'End';
    // Ignore non-navigation keys
    if (!isLeft && !isRight && !isHome && !isEnd) {
      return;
    }

    const {chips} = this as {chips: MaybeMultiActionChip[]};
    // Don't try to select another chip if there aren't any.
    if (chips.length < 2) {
      return;
    }

    // Prevent default interactions, such as scrolling.
    event.preventDefault();

    if (isHome || isEnd) {
      const index = isHome ? 0 : chips.length - 1;
      chips[index].focus({trailing: isEnd});
      this.updateTabIndices();
      return;
    }

    // Check if moving forwards or backwards
    const isRtl = getComputedStyle(this).direction === 'rtl';
    const forwards = isRtl ? isLeft : isRight;
    const focusedChip = chips.find(chip => chip.matches(':focus-within'));
    if (!focusedChip) {
      // If there is not already a chip focused, select the first or last chip
      // based on the direction we're traveling.
      const nextChip = forwards ? chips[0] : chips[chips.length - 1];
      nextChip.focus({trailing: !forwards});
      this.updateTabIndices();
      return;
    }

    const currentIndex = chips.indexOf(focusedChip);
    let nextIndex = forwards ? currentIndex + 1 : currentIndex - 1;
    // Search for the next sibling that is not disabled to select.
    // If we return to the host index, there is nothing to select.
    while (nextIndex !== currentIndex) {
      if (nextIndex >= chips.length) {
        // Return to start if moving past the last item.
        nextIndex = 0;
      } else if (nextIndex < 0) {
        // Go to end if moving before the first item.
        nextIndex = chips.length - 1;
      }

      // Check if the next sibling is disabled. If so,
      // move the index and continue searching.
      //
      // Some toolbar items may be focusable when disabled for increased
      // visibility.
      const nextChip = chips[nextIndex];
      if (nextChip.disabled && !nextChip.alwaysFocusable) {
        if (forwards) {
          nextIndex++;
        } else {
          nextIndex--;
        }

        continue;
      }

      nextChip.focus({trailing: !forwards});
      this.updateTabIndices();
      break;
    }
  }

  private updateTabIndices() {
    // The chip that should be focusable is either the chip that currently has
    // focus or the first chip that can be focused.
    const {chips} = this;
    let chipToFocus: Chip|undefined;
    for (const chip of chips) {
      const isChipFocusable = chip.alwaysFocusable || !chip.disabled;
      const chipIsFocused = chip.matches(':focus-within');
      if (chipIsFocused && isChipFocusable) {
        // Found the first chip that is actively focused. This overrides the
        // first focusable chip found.
        chipToFocus = chip;
        continue;
      }

      if (isChipFocusable && !chipToFocus) {
        chipToFocus = chip;
      }

      // Disable non-focused chips. If we disable all of them, we'll grant focus
      // to the first focusable child that was found.
      chip.tabIndex = -1;
    }

    if (chipToFocus) {
      chipToFocus.tabIndex = 0;
    }
  }
}

interface MaybeMultiActionChip extends Chip {
  focus(options?: FocusOptions&{trailing?: boolean}): void;
}
