import { expect } from "chai";
import {
  createDropdownId,
  isDropdownOpen,
  isAnyDropdownOpen,
  closeOpenDropdown,
  wrapDropdownHandlerWorkaround,
  subscribeDropdown
} from '../../scene/src/service/dropdown-open-registry'

describe("dropdown-open-registry", () => {
  beforeEach(() => {
    closeOpenDropdown(); // reset module state to "nothing open"
  });

  it("reports no open dropdown by default", () => {
    expect(isAnyDropdownOpen()).to.eq(false);
  });

  it("createDropdownId returns unique ids", () => {
    expect(createDropdownId()).to.not.eq(createDropdownId());
  });

  it("wrapDropdownHandlerWorkaround opens the dropdown and runs the handler", () => {
    let ran = false
    const a = createDropdownId()
    wrapDropdownHandlerWorkaround(a, () => { ran = true })
    expect(isDropdownOpen(a)).to.eq(true);
    expect(isAnyDropdownOpen()).to.eq(true);
    expect(ran).to.eq(true);
  });

  it("clicking the open dropdown again toggles it closed", () => {
    const a = createDropdownId()
    wrapDropdownHandlerWorkaround(a)
    wrapDropdownHandlerWorkaround(a)
    expect(isDropdownOpen(a)).to.eq(false);
    expect(isAnyDropdownOpen()).to.eq(false);
  });

  it("opening a different dropdown closes the previously-open one", () => {
    const a = createDropdownId()
    const b = createDropdownId()
    wrapDropdownHandlerWorkaround(a)
    wrapDropdownHandlerWorkaround(b)
    expect(isDropdownOpen(a)).to.eq(false);
    expect(isDropdownOpen(b)).to.eq(true);
  });

  it("closeOpenDropdown closes the open one and is a no-op when none", () => {
    const a = createDropdownId()
    wrapDropdownHandlerWorkaround(a)
    closeOpenDropdown()
    expect(isAnyDropdownOpen()).to.eq(false);
    closeOpenDropdown(); // no throw
    expect(isAnyDropdownOpen()).to.eq(false);
  });

  it("works with no handler", () => {
    const a = createDropdownId()
    wrapDropdownHandlerWorkaround(a); // no throw
    expect(isDropdownOpen(a)).to.eq(true);
  });

  it("id=null closes any open dropdown and runs the handler", () => {
    let ran = false
    const a = createDropdownId()
    wrapDropdownHandlerWorkaround(a) // open a
    wrapDropdownHandlerWorkaround(null, () => { ran = true })
    expect(isAnyDropdownOpen()).to.eq(false);
    expect(ran).to.eq(true);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    let calls = 0
    const a = createDropdownId()
    const unsubscribe = subscribeDropdown(() => { calls++ })
    wrapDropdownHandlerWorkaround(a) // open -> notify
    closeOpenDropdown()              // close -> notify
    expect(calls).to.eq(2);
    unsubscribe()
    wrapDropdownHandlerWorkaround(a) // no longer notified
    expect(calls).to.eq(2);
    closeOpenDropdown() // reset for next test
  });

  it("closeOpenDropdown does not notify when nothing is open", () => {
    let calls = 0
    const unsubscribe = subscribeDropdown(() => { calls++ })
    closeOpenDropdown()
    expect(calls).to.eq(0);
    unsubscribe()
  });
});
