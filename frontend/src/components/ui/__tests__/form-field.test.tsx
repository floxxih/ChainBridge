import { render, screen } from "@testing-library/react";
import { FormField } from "../form-field";

describe("FormField", () => {
  it("renders label when provided", () => {
    render(
      <FormField id="test-field" label="Test Label">
        {(props) => <input {...props} />}
      </FormField>
    );

    expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
  });

  it("renders without label", () => {
    render(
      <FormField id="test-field">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "test-field");
  });

  it("renders hint text when provided", () => {
    render(
      <FormField id="test-field" hint="This is a hint">
        {(props) => <input {...props} />}
      </FormField>
    );

    expect(screen.getByText("This is a hint")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(
      <FormField id="test-field" error="This field is required">
        {(props) => <input {...props} />}
      </FormField>
    );

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("This field is required");
  });

  it("hides hint when error is present", () => {
    render(
      <FormField
        id="test-field"
        hint="This is a hint"
        error="This field is required"
      >
        {(props) => <input {...props} />}
      </FormField>
    );

    expect(screen.queryByText("This is a hint")).not.toBeInTheDocument();
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("wires aria-describedby to error when error is present", () => {
    render(
      <FormField id="test-field" error="This field is required">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "test-field-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("wires aria-describedby to hint when hint is present and no error", () => {
    render(
      <FormField id="test-field" hint="This is a hint">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "test-field-hint");
  });

  it("sets aria-invalid to true when error is present", () => {
    render(
      <FormField id="test-field" error="Error message">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not set aria-invalid when no error", () => {
    render(
      <FormField id="test-field">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("sets aria-required when required prop is true", () => {
    render(
      <FormField id="test-field" label="Required Field" required>
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("shows required asterisk when required prop is true", () => {
    render(
      <FormField id="test-field" label="Required Field" required>
        {(props) => <input {...props} />}
      </FormField>
    );

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("works with select elements", () => {
    render(
      <FormField id="test-select" label="Choose Option" error="Selection required">
        {(props) => (
          <select {...props}>
            <option value="">Select...</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </select>
        )}
      </FormField>
    );

    const select = screen.getByLabelText("Choose Option");
    expect(select).toHaveAttribute("aria-describedby", "test-select-error");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });

  it("works with textarea elements", () => {
    render(
      <FormField id="test-textarea" label="Description" hint="Max 500 characters">
        {(props) => <textarea {...props} />}
      </FormField>
    );

    const textarea = screen.getByLabelText("Description");
    expect(textarea).toHaveAttribute("aria-describedby", "test-textarea-hint");
  });

  it("works with custom controls", () => {
    const CustomControl = (props: any) => (
      <div {...props} role="combobox" aria-expanded="false">
        Custom Control
      </div>
    );

    render(
      <FormField id="custom-field" label="Custom Field" hint="Custom hint">
        {(props) => <CustomControl {...props} />}
      </FormField>
    );

    const control = screen.getByRole("combobox");
    expect(control).toHaveAttribute("id", "custom-field");
    expect(control).toHaveAttribute("aria-describedby", "custom-field-hint");
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(
      <FormField id="test-field" className="custom-wrapper-class">
        {(props) => <input {...props} />}
      </FormField>
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-wrapper-class");
  });

  it("applies custom labelClassName to label", () => {
    render(
      <FormField
        id="test-field"
        label="Custom Label"
        labelClassName="custom-label-class"
      >
        {(props) => <input {...props} />}
      </FormField>
    );

    const label = screen.getByText("Custom Label");
    expect(label).toHaveClass("custom-label-class");
  });

  it("passes id to child control", () => {
    render(
      <FormField id="unique-id">
        {(props) => <input {...props} />}
      </FormField>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "unique-id");
  });
});
