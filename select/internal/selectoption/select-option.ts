/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import '../../../ripple/ripple.js';
import '../../../focus/md-focus-ring.js';
import '../../../labs/item/item.js';

import {html, LitElement, nothing} from 'lit';
import {property, query, queryAssignedElements} from 'lit/decorators.js';
import {ClassInfo, classMap} from 'lit/directives/class-map.js';

import {ARIAMixinStrict} from '../../../internal/aria/aria.js';
import {requestUpdateOnAriaChange} from '../../../internal/aria/delegate.js';

import {SelectOption, SelectOptionController} from './selectOptionController.js';

/**
 * @fires close-menu Closes the encapsulating menu on
 * @fires request-selection Requests the parent md-select to select this element
 * (and deselect others if single-selection) when `selected` changed to `true`.
 * @fires request-deselection Requests the parent md-select to deselect this
 * element when `selected` changed to `false`.
 */
export class SelectOptionEl extends LitElement implements SelectOption {
  static {
    requestUpdateOnAriaChange(SelectOptionEl);
  }

  /** @nocollapse */
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };

  /**
   * Disables the item and makes it non-selectable and non-interactive.
   */
  @property({type: Boolean, reflect: true}) disabled = false;

  /**
   * READONLY: self-identifies as a menu item and sets its identifying attribute
   */
  @property({type: Boolean, attribute: 'md-menu-item', reflect: true})
  isMenuItem = true;

  /**
   * Sets the item in the selected visual state when a submenu is opened.
   */
  @property({type: Boolean}) selected = false;
  /**
   * Form value of the option.
   */
  @property() value = '';

  @query('.list-item') protected readonly listItemRoot!: HTMLElement|null;

  @queryAssignedElements({slot: 'headline'})
  protected readonly headlineElements!: HTMLElement[];

  type = 'option' as const;

  /**
   * The text that is selectable via typeahead. If not set, defaults to the
   * innerText of the item slotted into the `"headline"` slot.
   */
  get typeaheadText() {
    return this.selectOptionController.typeaheadText;
  }

  @property({attribute: 'typeahead-text'})
  set typeaheadText(text: string) {
    this.selectOptionController.setTypeaheadText(text);
  }

  /**
   * The text that is displayed in the select field when selected. If not set,
   * defaults to the textContent of the item slotted into the `"headline"` slot.
   */
  get displayText() {
    return this.selectOptionController.displayText;
  }

  @property({attribute: 'display-text'})
  set displayText(text: string) {
    this.selectOptionController.setDisplayText(text);
  }

  private readonly selectOptionController = new SelectOptionController(this, {
    getHeadlineElements: () => {
      return this.headlineElements;
    }
  });

  protected override render() {
    return this.renderListItem(html`
      <md-item>
        <div slot="container">
          ${this.renderRipple()}
          ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `);
  }

  /**
   * Renders the root list item.
   *
   * @param content the child content of the list item.
   */
  protected renderListItem(content: unknown) {
    return html`
      <li
        id="item"
        tabindex=${this.disabled ? -1 : 0}
        role=${this.selectOptionController.role}
        aria-label=${(this as ARIAMixinStrict).ariaLabel || nothing}
        aria-selected=${(this as ARIAMixinStrict).ariaSelected || nothing}
        aria-checked=${(this as ARIAMixinStrict).ariaChecked || nothing}
        aria-expanded=${(this as ARIAMixinStrict).ariaExpanded || nothing}
        aria-haspopup=${(this as ARIAMixinStrict).ariaHasPopup || nothing}
        class="list-item ${classMap(this.getRenderClasses())}"
        @click=${this.selectOptionController.onClick}
        @keydown=${this.selectOptionController.onKeydown}
      >${content}</li>
    `;
  }

  /**
   * Handles rendering of the ripple element.
   */
  protected renderRipple() {
    return html`
      <md-ripple
          part="ripple"
          for="item"
          ?disabled=${this.disabled}></md-ripple>`;
  }

  /**
   * Handles rendering of the focus ring.
   */
  protected renderFocusRing() {
    return html`
      <md-focus-ring
          part="focus-ring"
          for="item"
          inward></md-focus-ring>`;
  }

  /**
   * Classes applied to the list item root.
   */
  protected getRenderClasses(): ClassInfo {
    return {
      'disabled': this.disabled,
      'selected': this.selected,
    };
  }

  /**
   * Handles rendering the headline and supporting text.
   */
  protected renderBody() {
    return html`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot name="trailing-supporting-text"
          slot="trailing-supporting-text"></slot>
    `;
  }

  override focus() {
    // TODO(b/300334509): needed for some cases where delegatesFocus doesn't
    // work programmatically like in FF and select-option
    this.listItemRoot?.focus();
  }
}
