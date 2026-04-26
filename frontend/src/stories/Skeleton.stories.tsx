import type { Meta, StoryObj } from "@storybook/react";
import { CardSkeleton, ListItemSkeleton, FormSkeleton, TimelineItemSkeleton, StatCardSkeleton, TableRowSkeleton, AvatarSkeleton, BadgeSkeleton, Skeleton } from "@/components/ui/spinner";

const meta = {
  title: "UI/Skeletons",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;

export const Base: StoryObj = {
  render: () => <Skeleton className="h-4 w-full" />,
};

export const CardSkeletonStory: StoryObj = {
  render: () => <CardSkeleton className="max-w-md" />,
};

export const ListItemSkeletonStory: StoryObj = {
  render: () => <ListItemSkeleton className="max-w-md" />,
};

export const FormSkeletonStory: StoryObj = {
  render: () => <FormSkeleton rows={4} className="max-w-sm" />,
};

export const TimelineItemSkeletonStory: StoryObj = {
  render: () => <TimelineItemSkeleton className="max-w-sm" />,
};

export const StatCardSkeletonStory: StoryObj = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 max-w-md">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  ),
};

export const TableRowSkeletonStory: StoryObj = {
  render: () => (
    <table className="w-full max-w-md">
      <tbody>
        <TableRowSkeleton cols={4} />
        <TableRowSkeleton cols={4} />
        <TableRowSkeleton cols={4} />
      </tbody>
    </table>
  ),
};

export const AvatarSkeletonStory: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <AvatarSkeleton size="sm" />
      <AvatarSkeleton size="md" />
      <AvatarSkeleton size="lg" />
    </div>
  ),
};

export const BadgeSkeletonStory: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <BadgeSkeleton />
      <BadgeSkeleton className="w-28" />
      <BadgeSkeleton className="w-36" />
    </div>
  ),
};

export const AllSkeletons: StoryObj = {
  render: () => (
    <div className="space-y-8 p-8 max-w-2xl">
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Cards</h3>
        <CardSkeleton />
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">List Items</h3>
        <div className="space-y-2">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Form Fields</h3>
        <FormSkeleton rows={3} />
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Timeline</h3>
        <div className="space-y-0">
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Stat Cards</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Table Rows</h3>
        <table className="w-full">
          <tbody>
            <TableRowSkeleton cols={4} />
            <TableRowSkeleton cols={4} />
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Avatars</h3>
        <div className="flex items-center gap-4">
          <AvatarSkeleton size="sm" />
          <AvatarSkeleton size="md" />
          <AvatarSkeleton size="lg" />
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2 text-text-muted uppercase tracking-wide">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeSkeleton />
          <BadgeSkeleton />
          <BadgeSkeleton className="w-28" />
        </div>
      </section>
    </div>
  ),
};