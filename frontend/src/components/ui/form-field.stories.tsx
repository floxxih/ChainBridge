import type { Meta, StoryObj } from "@storybook/react";
import { FormField } from "./form-field";
import { ChevronDown, Mail, Lock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const meta = {
  title: "UI/FormField",
  component: FormField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    id: {
      control: "text",
      description: "Unique identifier for the form control",
    },
    label: {
      control: "text",
      description: "Label text displayed above the control",
    },
    error: {
      control: "text",
      description: "Error message displayed below the control",
    },
    hint: {
      control: "text",
      description: "Hint text displayed below the control when no error",
    },
    required: {
      control: "boolean",
      description: "Whether the field is required",
    },
    children: {
      table: {
        disable: true,
      },
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Input Examples
// ============================================================================

export const BasicInput: Story = {
  args: {
    id: "email",
    label: "Email Address",
    hint: "We'll never share your email",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <input
            {...props}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </FormField>
    </div>
  ),
};

export const InputWithError: Story = {
  args: {
    id: "password",
    label: "Password",
    error: "Password must be at least 8 characters",
    required: true,
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <input
            {...props}
            type="password"
            className={cn(
              "w-full rounded-xl border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2",
              props["aria-invalid"]
                ? "border-status-error/50 bg-status-error/5 focus:ring-status-error/50"
                : "border-border bg-surface-raised focus:ring-ring"
            )}
          />
        )}
      </FormField>
    </div>
  ),
};

export const RequiredField: Story = {
  args: {
    id: "username",
    label: "Username",
    hint: "Choose a unique username",
    required: true,
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <input
            {...props}
            type="text"
            placeholder="johndoe"
            className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </FormField>
    </div>
  ),
};

// ============================================================================
// Input with Icons
// ============================================================================

export const InputWithLeftIcon: Story = {
  args: {
    id: "email-icon",
    label: "Email Address",
    hint: "Enter your work email",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              {...props}
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </FormField>
    </div>
  ),
};

export const InputWithRightIcon: Story = {
  args: {
    id: "amount",
    label: "Amount",
    hint: "Enter amount in USD",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              {...props}
              type="number"
              placeholder="0.00"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </FormField>
    </div>
  ),
};

// ============================================================================
// Select Examples
// ============================================================================

export const SelectDropdown: Story = {
  args: {
    id: "country",
    label: "Country",
    hint: "Select your country of residence",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <div className="relative">
            <select
              {...props}
              className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a country...</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
              <option value="de">Germany</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          </div>
        )}
      </FormField>
    </div>
  ),
};

export const SelectWithError: Story = {
  args: {
    id: "chain",
    label: "Blockchain",
    error: "Please select a blockchain",
    required: true,
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <div className="relative">
            <select
              {...props}
              className={cn(
                "w-full appearance-none rounded-xl border px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:ring-2",
                props["aria-invalid"]
                  ? "border-status-error/50 bg-status-error/5 focus:ring-status-error/50"
                  : "border-border bg-surface-raised focus:ring-ring"
              )}
            >
              <option value="">Select blockchain...</option>
              <option value="bitcoin">Bitcoin</option>
              <option value="ethereum">Ethereum</option>
              <option value="stellar">Stellar</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          </div>
        )}
      </FormField>
    </div>
  ),
};

// ============================================================================
// Textarea Example
// ============================================================================

export const TextareaField: Story = {
  args: {
    id: "description",
    label: "Description",
    hint: "Maximum 500 characters",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <textarea
            {...props}
            rows={4}
            placeholder="Enter description..."
            className="w-full resize-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </FormField>
    </div>
  ),
};

// ============================================================================
// Without Label
// ============================================================================

export const WithoutLabel: Story = {
  args: {
    id: "search",
    hint: "Search by name or address",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        {(props) => (
          <input
            {...props}
            type="search"
            placeholder="Search..."
            className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </FormField>
    </div>
  ),
};

// ============================================================================
// Form Example with Multiple Fields
// ============================================================================

export const CompleteForm: Story = {
  render: () => (
    <div className="w-96 space-y-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary">Create Account</h2>
      
      <FormField id="form-email" label="Email" hint="We'll send a verification link" required>
        {(props) => (
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              {...props}
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </FormField>

      <FormField id="form-password" label="Password" hint="At least 8 characters" required>
        {(props) => (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              {...props}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </FormField>

      <FormField id="form-country" label="Country" required>
        {(props) => (
          <div className="relative">
            <select
              {...props}
              className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select...</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          </div>
        )}
      </FormField>

      <button className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
        Create Account
      </button>
    </div>
  ),
};
