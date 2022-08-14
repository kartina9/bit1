import React, { HTMLAttributes, useMemo, useContext, useEffect, useRef } from 'react';
import { useComponentCompare } from '@teambit/component.ui.compare';
import { LegacyComponentLog } from '@teambit/legacy-component-log';
import { VersionBlock } from '@teambit/component.ui.version-block';
import { ComponentContext } from '@teambit/component';
import classNames from 'classnames';

import styles from './component-compare-changelog.module.scss';

export type ComponentCompareChangelog = {} & HTMLAttributes<HTMLDivElement>;

const orderByDate: (
  logA?: LegacyComponentLog,
  logB?: LegacyComponentLog
) => [LegacyComponentLog | undefined, LegacyComponentLog | undefined] = (logA, logB) => {
  const { date: dateStrB } = logB || {};
  const { date: dateStrA } = logA || {};

  const dateA = useMemo(() => (dateStrA ? new Date(parseInt(dateStrA)) : new Date()), [dateStrA]);
  const dateB = useMemo(() => (dateStrB ? new Date(parseInt(dateStrB)) : new Date()), [dateStrB]);

  if (dateA < dateB) return [logA, logB];
  return [logB, logA];
};

const getLogsBetweenVersions: (
  allLogs: LegacyComponentLog[],
  baseVersion?: LegacyComponentLog,
  compareVersion?: LegacyComponentLog
) => LegacyComponentLog[] = (allLogs, baseVersion, compareVersion) => {
  const [startingVersion, endingVersion] = orderByDate(baseVersion, compareVersion);
  const { startingVersionIndex, endingVersionIndex } = allLogs.reduce((accum, next, index) => {
    if (next.hash === startingVersion?.hash) {
      accum = { ...accum, startingVersionIndex: index };
    }
    if (next.hash === endingVersion?.hash) {
      accum = { ...accum, endingVersionIndex: index };
    }
    return accum;
  }, {} as { startingVersionIndex: number; endingVersionIndex: number });

  return allLogs.filter((_, index) => index >= startingVersionIndex && index <= endingVersionIndex);
};

export function ComponentCompareChangelog({ className }: ComponentCompareChangelog) {
  const component = useContext(ComponentContext);
  const componentCompareContext = useComponentCompare();
  const { base, compare, logsByVersion } = componentCompareContext || {};
  const ref = useRef<HTMLDivElement>(null);

  const allLogs = compare?.model.logs || [];
  const baseVersionInfo = base?.model.version ? logsByVersion?.get(base?.model.version) : undefined;
  const compareVersionInfo = compare?.model.version ? logsByVersion?.get(compare?.model.version) : undefined;

  const logs = useMemo(
    () => getLogsBetweenVersions(allLogs, baseVersionInfo, compareVersionInfo),
    [baseVersionInfo, compareVersionInfo]
  );

  useEffect(
    () =>
      /**
       * @HACK
       * For some reason this always scroll to the earliest version
       * We always want it to stay scrolled to the top when it renders
       * The empty div in the bottom, gets moved to the top because of css; flex-direction: column-reverse
       * which we use as a ref to scroll to the top
       * */
      ref.current?.scrollIntoView(false),
    [baseVersionInfo, compareVersionInfo]
  );

  return (
    <div className={classNames(styles.changeLogPage, className)}>
      {logs.map((snap, index) => {
        const isLatest = component.latest === snap.tag || component.latest === snap.hash;
        const isCurrent = component.version === snap.tag || component.version === snap.hash;
        return (
          <VersionBlock
            isCurrent={isCurrent}
            isLatest={isLatest}
            key={index}
            componentId={component.id.fullName}
            snap={snap}
          />
        );
      })}
      <div ref={ref}></div>
    </div>
  );
}