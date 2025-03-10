/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import '../../focus/md-focus-ring.js';
import '../../ripple/ripple.js';

import {html, isServer, LitElement, nothing, PropertyValues, TemplateResult} from 'lit';
import {property, query} from 'lit/decorators.js';
import {ClassInfo, classMap} from 'lit/directives/class-map.js';

import {requestUpdateOnAriaChange} from '../../internal/aria/delegate.js';
import {dispatchActivationClick, isActivationClick, redispatchEvent} from '../../internal/controller/events.js';

/**
 * @fires input {InputEvent} Fired whenever `selected` changes due to user
 * interaction (bubbles and composed).
 * @fires change {Event} Fired whenever `selected` changes due to user
 * interaction (bubbles).
 */
export class Switch extends LitElement {
  static {
    requestUpdateOnAriaChange(Switch);
  }

  /** @nocollapse */
  static override shadowRootOptions:
      ShadowRootInit = {mode: 'open', delegatesFocus: true};

  /** @nocollapse */
  static readonly formAssociated = true;

  /**
   * Disables the switch and makes it non-interactive.
   */
  @property({type: Boolean, reflect: true}) disabled = false;

  /**
   * Puts the switch in the selected state and sets the form submission value to
   * the `value` property.
   */
  @property({type: Boolean}) selected = false;

  /**
   * Shows both the selected and deselected icons.
   */
  @property({type: Boolean}) icons = false;

  /**
   * Shows only the selected icon, and not the deselected icon. If `true`,
   * overrides the behavior of the `icons` property.
   */
  @property({type: Boolean, attribute: 'show-only-selected-icon'})
  showOnlySelectedIcon = false;

  /**
   * When true, require the switch to be selected when participating in
   * form submission.
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox#validation
   */
  @property({type: Boolean}) required = false;

  /**
   * The value associated with this switch on form submission. `null` is
   * submitted when `selected` is `false`.
   */
  @property() value = 'on';

  /**
   * The HTML name to use in form submission.
   */
  get name() {
    return this.getAttribute('name') ?? '';
  }
  set name(name: string) {
    this.setAttribute('name', name);
  }

  /**
   * The associated form element with which this element's value will submit.
   */
  get form() {
    return this.internals.form;
  }

  /**
   * The labels this element is associated with.
   */
  get labels() {
    return this.internals.labels;
  }

  /**
   * Returns a ValidityState object that represents the validity states of the
   * switch.
   *
   * Note that switches will only set `valueMissing` if `required` and not
   * selected.
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox#validation
   */
  get validity() {
    this.syncValidity();
    return this.internals.validity;
  }

  /**
   * Returns the native validation error message.
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation#constraint_validation_process
   */
  get validationMessage() {
    this.syncValidity();
    return this.internals.validationMessage;
  }

  /**
   * Returns whether an element will successfully validate based on forms
   * validation rules and constraints.
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation#constraint_validation_process
   */
  get willValidate() {
    this.syncValidity();
    return this.internals.willValidate;
  }

  @query('input') private readonly input!: HTMLInputElement|null;
  // Needed for Safari, see https://bugs.webkit.org/show_bug.cgi?id=261432
  // Replace with this.internals.validity.customError when resolved.
  private hasCustomValidityError = false;
  private readonly internals =
      (this as HTMLElement /* needed for closure */).attachInternals();

  constructor() {
    super();
    if (!isServer) {
      this.addEventListener('click', (event: MouseEvent) => {
        if (!isActivationClick(event)) {
          return;
        }
        this.focus();
        dispatchActivationClick(this.input!);
      });
    }
  }

  /**
   * Checks the switch's native validation and returns whether or not the
   * element is valid.
   *
   * If invalid, this method will dispatch the `invalid` event.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/checkValidity
   *
   * @return true if the switch is valid, or false if not.
   */
  checkValidity() {
    this.syncValidity();
    return this.internals.checkValidity();
  }

  /**
   * Checks the switch's native validation and returns whether or not the
   * element is valid.
   *
   * If invalid, this method will dispatch the `invalid` event.
   *
   * The `validationMessage` is reported to the user by the browser. Use
   * `setCustomValidity()` to customize the `validationMessage`.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/reportValidity
   *
   * @return true if the switch is valid, or false if not.
   */
  reportValidity() {
    this.syncValidity();
    return this.internals.reportValidity();
  }

  /**
   * Sets the switch's native validation error message. This is used to
   * customize `validationMessage`.
   *
   * When the error is not an empty string, the switch is considered invalid
   * and `validity.customError` will be true.
   *
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity
   *
   * @param error The error message to display.
   */
  setCustomValidity(error: string) {
    this.hasCustomValidityError = !!error;
    this.internals.setValidity({customError: !!error}, error, this.getInput());
  }

  protected override update(changed: PropertyValues<Switch>) {
    const state = String(this.selected);
    this.internals.setFormValue(this.selected ? this.value : null, state);
    super.update(changed);
  }

  protected override render(): TemplateResult {
    // NOTE: buttons must use only [phrasing
    // content](https://html.spec.whatwg.org/multipage/dom.html#phrasing-content)
    // children, which includes custom elements, but not `div`s
    return html`
      <div class="switch ${classMap(this.getRenderClasses())}">
        <input
          id="switch"
          class="touch"
          type="checkbox"
          role="switch"
          aria-label=${(this as ARIAMixin).ariaLabel || nothing}
          ?checked=${this.selected}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this.handleChange}
        >

        <md-focus-ring part="focus-ring" for="switch"></md-focus-ring>
        <span class="track">
          ${this.renderHandle()}
        </span>
      </div>
    `;
  }

  protected override updated() {
    // Sync validity when properties change, since validation properties may
    // have changed.
    this.syncValidity();
  }

  private getRenderClasses(): ClassInfo {
    return {
      'selected': this.selected,
      'unselected': !this.selected,
      'disabled': this.disabled,
    };
  }

  private renderHandle() {
    const classes = {
      'with-icon': this.showOnlySelectedIcon ? this.selected : this.icons,
    };
    return html`
      ${this.renderTouchTarget()}
      <span class="handle-container">
        <md-ripple for="switch" ?disabled="${this.disabled}"></md-ripple>
        <span class="handle ${classMap(classes)}">
          ${this.shouldShowIcons() ? this.renderIcons() : html``}
        </span>
      </span>
    `;
  }

  private renderIcons() {
    return html`
      <div class="icons">
        ${this.renderOnIcon()}
        ${this.showOnlySelectedIcon ? html`` : this.renderOffIcon()}
      </div>
    `;
  }

  /**
   * https://fonts.google.com/icons?selected=Material%20Symbols%20Outlined%3Acheck%3AFILL%400%3Bwght%40500%3BGRAD%400%3Bopsz%4024
   */
  private renderOnIcon() {
    return html`
      <svg class="icon icon--on" viewBox="0 0 24 24">
        <path d="M9.55 18.2 3.65 12.3 5.275 10.675 9.55 14.95 18.725 5.775 20.35 7.4Z"/>
      </svg>
    `;
  }

  /**
   * https://fonts.google.com/icons?selected=Material%20Symbols%20Outlined%3Aclose%3AFILL%400%3Bwght%40500%3BGRAD%400%3Bopsz%4024
   */
  private renderOffIcon() {
    return html`
      <svg class="icon icon--off" viewBox="0 0 24 24">
        <path d="M6.4 19.2 4.8 17.6 10.4 12 4.8 6.4 6.4 4.8 12 10.4 17.6 4.8 19.2 6.4 13.6 12 19.2 17.6 17.6 19.2 12 13.6Z"/>
      </svg>
    `;
  }

  private renderTouchTarget() {
    return html`<span class="touch"></span>`;
  }

  private shouldShowIcons(): boolean {
    return this.icons || this.showOnlySelectedIcon;
  }

  private handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.selected = target.checked;
    redispatchEvent(this, event);
  }

  private syncValidity() {
    // Sync the internal <input>'s validity and the host's ElementInternals
    // validity. We do this to re-use native `<input>` validation messages.
    const input = this.getInput();
    if (this.hasCustomValidityError) {
      input.setCustomValidity(this.internals.validationMessage);
    } else {
      input.setCustomValidity('');
    }

    this.internals.setValidity(
        input.validity, input.validationMessage, this.getInput());
  }

  private getInput() {
    if (!this.input) {
      // If the input is not yet defined, synchronously render.
      this.connectedCallback();
      this.performUpdate();
    }

    if (this.isUpdatePending) {
      // If there are pending updates, synchronously perform them. This ensures
      // that constraint validation properties (like `required`) are synced
      // before interacting with input APIs that depend on them.
      this.scheduleUpdate();
    }

    return this.input!;
  }

  /** @private */
  formResetCallback() {
    // The selected property does not reflect, so the original attribute set by
    // the user is used to determine the default value.
    this.selected = this.hasAttribute('selected');
  }

  /** @private */
  formStateRestoreCallback(state: string) {
    this.selected = state === 'true';
  }
}
