/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A unique symbol used for protected access to an instance's
 * `ElementInternals`.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   static formAssociated = true;
 *
 *   [internals] = this.attachInternals();
 * }
 *
 * function getForm(element: MyElement) {
 *   return element[internals].form;
 * }
 * ```
 */
export const internals = Symbol('internals');

/**
 * An instance with `ElementInternals`.
 *
 * Use this when protected access is needed for an instance's `ElementInternals`
 * from other files. A unique symbol is used to access the internals.
 */
export interface WithInternals {
  /**
   * An instance's `ElementInternals`.
   */
  [internals]: ElementInternals;
}
