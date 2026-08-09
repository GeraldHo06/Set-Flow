# Spec: Friends Connection & Collaboration (Step 1)

This specification outlines the technical design for adding a social Friends system to the SetFlow practice studio. It includes the user connection flow (requesting/accepting), inviting friends to Bands & Groups, and sharing setlists directly for live read-only practice.

---

## Database Schema (SQL)

The following tables and Row Level Security (RLS) policies are set up in Supabase to support friendships and setlist sharing:

```sql
-- 1. Sync emails to profiles for search capability
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. Friendships table
CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_friendship_request UNIQUE (sender_id, receiver_id),
    CONSTRAINT self_friendship CHECK (sender_id != receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own friendships" ON public.friendships
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships
    FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 3. Shared Setlists table
CREATE TABLE public.shared_setlists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    setlist_id uuid REFERENCES public."Setlist"(id) ON DELETE CASCADE NOT NULL,
    shared_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shared_to uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_shared_setlist UNIQUE (setlist_id, shared_to),
    CONSTRAINT self_share CHECK (shared_by != shared_to)
);

ALTER TABLE public.shared_setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared setlists" ON public.shared_setlists
    FOR SELECT USING (auth.uid() = shared_to OR auth.uid() = shared_by);

CREATE POLICY "Users can share own setlists" ON public.shared_setlists
    FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can unshare setlists" ON public.shared_setlists
    FOR DELETE USING (auth.uid() = shared_to OR auth.uid() = shared_by);
```

---

## Proposed Changes

### 1. Navigation Updates

#### [MODIFY] [Sidebar.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/components/layout/Sidebar.jsx)
*   Add a link to the `/friends` route using the `UserPlus` icon.
*   Label: `Friends`.

#### [MODIFY] [MobileNav.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/components/layout/MobileNav.jsx)
*   Integrate `Friends` link into the bottom navigation bar.

#### [MODIFY] [App.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/App.jsx)
*   Import the new `Friends` page and define the `/friends` route under the authenticated layout wrapper.

---

## 2. Friends Page & Interface

#### [NEW] [Friends.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/pages/Friends.jsx)
*   **Aesthetics:** Dark modern UI matching the rest of the application (glassmorphic cards, border-border/50, custom tab buttons).
*   **State Management:** Fetch all connections using `useQuery` from `@tanstack/react-query` to support instant UI updates.
*   **Tabs:**
    *   **My Friends:** Lists all accepted friendships. Shows:
        *   Avatar circle with initials.
        *   Display name and instrument.
        *   "Unfriend" action button.
    *   **Requests:**
        *   *Incoming:* List profiles requesting friendship with `[Accept]` and `[Decline]` buttons.
        *   *Outgoing:* List pending requests sent by the current user with `[Cancel]` buttons.
    *   **Add Friend:**
        *   Input field for name/email + `[Search]` button.
        *   Results list showing user profiles. Adds an context-specific button next to each profile: `[Add Friend]`, `[Pending Outgoing]`, `[Accept Incoming]`, or `[Friends]`.

---

## 3. Collaboration & Sharing

#### [MODIFY] [Setlists.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/pages/Setlists.jsx)
*   Add a tab switcher at the top: **My Locker** vs **Shared with Me**.
*   **My Locker:** Display the user's setlists and group setlists (current behavior).
*   **Shared with Me:** Queries `shared_setlists` joining the `Setlist` details and owner display names. Renders read-only setlist cards.
*   **Share Modal Integration:** Add a `Share2` icon button to personal setlist cards that opens a dialog listing the user's friends with checkboxes. Checking a friend shares the setlist; unchecking revokes it.

#### [MODIFY] [SetlistDetail.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/pages/SetlistDetail.jsx)
*   Check if the current setlist is shared with the user (i.e. user is not the owner, and setlist is not owned by one of their groups).
*   If shared:
    *   Show a banner at the top: `Shared by [Friend's Name] (Read-Only)`.
    *   Hide / disable all mutation controls: "Add Song", "Edit Title", "Delete Setlist", and the drag-and-drop reordering.

#### [MODIFY] [GroupDetail.jsx](file:///c:/Users/Hewlett%20Packard/Desktop/Gerald/Enyao_website/src/pages/GroupDetail.jsx)
*   In the Member list, add an **"Invite Friends"** dropdown/modal.
*   Fetch the user's friends list and filter out friends who are already in the group.
*   Clicking a friend invites/adds them immediately to the group.

---

## Verification Plan

### Automated Verification
*   Compile and check Vite project compilation: `npm run build` or `npm run typecheck` to ensure no syntax errors.

### Manual Verification
1.  **Add Friend:** Search for another registered user by name or email. Click "Add Friend". Verify the request appears under "Outgoing Requests" on your end, and "Incoming Requests" on theirs.
2.  **Accept Request:** Log in as the receiver. Click "Accept". Verify they move to "My Friends" list on both accounts.
3.  **Group Invitation:** Navigate to a group detail page. Click "Invite Friends". Choose a friend from the list. Verify they are added to the group members list.
4.  **Setlist Share & Practice:**
    *   Create a setlist and upload a song.
    *   Click "Share" on the setlist card and select your friend.
    *   Log in as the friend. Go to "Shared with Me". Verify the setlist card is visible.
    *   Click the setlist. Verify you see the songs and can enter the practice mode, but cannot edit, rename, or reorder the setlist.
5.  **Remove Connection:** Click "Unfriend" on a friend. Verify that shared setlists from that friend are immediately removed from your "Shared with Me" tab.
