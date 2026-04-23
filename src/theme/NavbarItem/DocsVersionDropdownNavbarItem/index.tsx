import React, {useMemo, useState, useRef, useEffect} from 'react';
import clsx from 'clsx';
import {
  useVersions,
  useActiveDocContext,
  useDocsVersionCandidates,
  useDocsPreferredVersion,
} from '@docusaurus/plugin-content-docs/client';
import {useHistorySelector} from '@docusaurus/theme-common';
import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import NavbarNavLink from '@theme/NavbarItem/NavbarNavLink';
import styles from './styles.module.css';

type VersionItem = {
  version: {name: string; label: string; docs: {id: string; path: string}[]; mainDocId: string};
  label: string;
};

function getVersionItems(versions: VersionItem['version'][], configs?: unknown): VersionItem[] {
  if (configs) {
    const versionMap = new Map(versions.map((version) => [version.name, version]));
    const toVersionItem = (name: string, config: any) => {
      const version = versionMap.get(name);
      if (!version) {
        throw new Error(
          `No docs version exist for name '${name}', please verify your 'docsVersionDropdown' navbar item versions config.`,
        );
      }
      return {version, label: config?.label ?? version.label};
    };

    if (Array.isArray(configs)) {
      return configs.map((name) => toVersionItem(name, undefined));
    }

    return Object.entries(configs as Record<string, any>).map(([name, config]) => toVersionItem(name, config));
  }

  return versions.map((version) => ({version, label: version.label}));
}

function useVersionItems({docsPluginId, configs}: {docsPluginId?: string; configs?: unknown}): VersionItem[] {
  const versions = useVersions(docsPluginId);
  return getVersionItems(versions as any, configs);
}

function getVersionMainDoc(version: VersionItem['version']) {
  return version.docs.find((doc) => doc.id === version.mainDocId);
}

function getVersionTargetDoc(
  version: VersionItem['version'],
  activeDocContext: ReturnType<typeof useActiveDocContext>,
) {
  return activeDocContext.alternateDocVersions[version.name] ?? getVersionMainDoc(version);
}

function useDisplayedVersionItem({
  docsPluginId,
  versionItems,
}: {
  docsPluginId?: string;
  versionItems: VersionItem[];
}) {
  const candidates = useDocsVersionCandidates(docsPluginId);
  const candidateItems = candidates
    .map((candidate) => versionItems.find((vi) => vi.version === candidate))
    .filter((vi): vi is VersionItem => vi !== undefined);
  return candidateItems[0] ?? versionItems[0];
}

function getSemesterGroup(label: string): string {
  const match = /^(\d{4}\.\d+)/.exec(label.trim());
  return match?.[1] ?? 'Outros';
}

export default function DocsVersionDropdownNavbarItem({
  mobile,
  docsPluginId,
  dropdownActiveClassDisabled,
  dropdownItemsBefore = [],
  dropdownItemsAfter = [],
  versions: configs,
  position,
  className,
  ...props
}: any) {
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);
  const activeDocContext = useActiveDocContext(docsPluginId);
  const {savePreferredVersionName} = useDocsPreferredVersion(docsPluginId);

  const versionItems = useVersionItems({docsPluginId, configs});
  const displayedVersionItem = useDisplayedVersionItem({docsPluginId, versionItems});

  function versionItemToLink({version, label}: VersionItem) {
    const targetDoc = getVersionTargetDoc(version, activeDocContext);
    return {
      label,
      to: `${targetDoc.path}${search}${hash}`,
      isActive: () => version === activeDocContext.activeVersion,
      onClick: () => savePreferredVersionName(version.name),
    };
  }

  const flatItems = useMemo(
    () => [...dropdownItemsBefore, ...versionItems.map(versionItemToLink), ...dropdownItemsAfter],
    [dropdownItemsAfter, dropdownItemsBefore, versionItems, search, hash],
  );

  // Mobile: keep a simple flat dropdown (nested hover menus don't work well on touch).
  if (mobile) {
    if (flatItems.length <= 1) {
      return (
        <DefaultNavbarItem
          {...props}
          mobile
          label="Versão"
          to={getVersionTargetDoc(displayedVersionItem.version, activeDocContext).path}
          isActive={dropdownActiveClassDisabled ? () => false : undefined}
        />
      );
    }

    return (
      <DropdownNavbarItem
        {...props}
        mobile
        label="Versão"
        to={undefined}
        items={flatItems}
        isActive={dropdownActiveClassDisabled ? () => false : undefined}
      />
    );
  }

  // Desktop: group versions by semester (e.g. "2026.1") and show nested dropdown menu.
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of flatItems) {
      if (!item?.label || !item?.to) continue;
      const key = getSemesterGroup(String(item.label));
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }

    // Sort groups by most recent semester first (lexicographic works for "YYYY.S").
    const groups = Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));

    // Within a group, keep newest versions first (label contains vN).
    for (const [, items] of groups) {
      items.sort((x, y) => String(y.label).localeCompare(String(x.label)));
    }

    return groups;
  }, [flatItems]);

  // If we build the site with a single docs version, render just a button.
  if (flatItems.length <= 1) {
    return (
      <DefaultNavbarItem
        {...props}
        mobile={false}
        label="Versão"
        to={getVersionTargetDoc(displayedVersionItem.version, activeDocContext).path}
        isActive={dropdownActiveClassDisabled ? () => false : undefined}
      />
    );
  }

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) return;
      setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('focusin', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('focusin', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={clsx('navbar__item', 'dropdown', 'dropdown--hoverable', className, {
        'dropdown--right': position === 'right',
        'dropdown--show': showDropdown,
      })}>
      <NavbarNavLink
        aria-haspopup="true"
        aria-expanded={showDropdown}
        role="button"
        href="#"
        className={clsx('navbar__link', styles.versionsButton)}
        {...props}
        onClick={(e: any) => e.preventDefault()}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDropdown(!showDropdown);
          }
        }}>
        Versão
      </NavbarNavLink>

      <ul className={clsx('dropdown__menu', styles.semesterMenu)}>
        {grouped.map(([semester, items]) => (
          <li key={semester} className={clsx('dropdown__item', styles.semesterItem)}>
            <span className={clsx('dropdown__link', styles.semesterLabel)}>{semester}</span>
            <ul className={clsx('dropdown__menu', styles.versionSubmenu)}>
              {items.map((item, i) => (
                <li key={`${semester}-${i}`} className="dropdown__item">
                  <NavbarNavLink
                    isDropdownLink
                    className={clsx('dropdown__link', item.isActive?.() && 'dropdown__link--active')}
                    label={item.label}
                    to={item.to}
                    onClick={item.onClick}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

