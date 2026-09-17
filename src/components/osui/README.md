# osui — opensourceui.in components (MIT)

Every `.tsx` in this tree (except `workspace-switcher-client.tsx`) is copied
**verbatim** from [opensourceui.in](https://opensourceui.in)
([repo](https://github.com/bidyut10/opensourceui), MIT — © Bidyut Kundu),
then adapted only for imports:

- `@/lib/cn` → `@/lib/utils` (repo already has `cn()` from `clsx` + `tailwind-merge`)
- `workspace-switcher-dropdown.tsx`: brand icons → lucide (`GraduationCap`, `Briefcase`)
- `contact/copy-email.tsx`: `siteConfig.author.email` default → `""` (prop-supplied)

No other logic changes. If upstream updates a component, re-copy the file.
