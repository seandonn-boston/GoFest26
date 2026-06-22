// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Disclosure } from "./Disclosure";

describe("<Disclosure>", () => {
  it("hides its body until the header is clicked", () => {
    render(
      <Disclosure title="More info" hint={<span>peek</span>}>
        <p>secret body</p>
      </Disclosure>,
    );
    // Hint shows while collapsed; body does not.
    expect(screen.getByText("peek")).toBeInTheDocument();
    expect(screen.queryByText("secret body")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("secret body")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("starts open when defaultOpen is set", () => {
    render(
      <Disclosure title="x" defaultOpen>
        <p>shown immediately</p>
      </Disclosure>,
    );
    expect(screen.getByText("shown immediately")).toBeInTheDocument();
  });
});
