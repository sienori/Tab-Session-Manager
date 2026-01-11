export const makeSearchInfo = session => {
  const windows = Object.values(session.windows);
  const tabTitles = windows.map(window => Object.values(window).map(tab => tab.title));
  const joinedtitle = tabTitles.flat().join(" ").toLowerCase();
  return { id: session.id, tabsTitle: joinedtitle };
};
