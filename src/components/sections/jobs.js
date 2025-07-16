import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import { CSSTransition } from 'react-transition-group';
import styled from 'styled-components';
import { srConfig } from '@config';
import { KEY_CODES } from '@utils';
import sr from '@utils/sr';
import { usePrefersReducedMotion } from '@hooks';

const StyledJobsSection = styled.section`
  max-width: 700px;

  .inner {
    display: flex;

    @media (max-width: 600px) {
      display: block;
    }

    // Prevent container from jumping
    @media (min-width: 700px) {
      min-height: 340px;
    }
  }
`;

const StyledTabList = styled.div`
  position: relative;
  z-index: 3;
  width: max-content;
  padding: 0;
  margin: 0;
  list-style: none;

  @media (max-width: 600px) {
    display: flex;
    overflow-x: auto;
    width: calc(100% + 100px);
    padding-left: 50px;
    margin-left: -50px;
    margin-bottom: 30px;
  }
  @media (max-width: 480px) {
    width: calc(100% + 50px);
    padding-left: 25px;
    margin-left: -25px;
  }

  li {
    &:first-of-type {
      @media (max-width: 600px) {
        margin-left: 50px;
      }
      @media (max-width: 480px) {
        margin-left: 25px;
      }
    }
    &:last-of-type {
      @media (max-width: 600px) {
        padding-right: 50px;
      }
      @media (max-width: 480px) {
        padding-right: 25px;
      }
    }
  }
`;

const StyledTabButton = styled.button`
  ${({ theme }) => theme.mixins.link};
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--tab-height);
  padding: 0 20px 2px;
  border-left: 2px solid var(--lightest-navy);
  background-color: transparent;
  color: ${(props) => (props['data-active'] === true ? 'var(--green)' : 'var(--slate)')};
  font-family: var(--font-mono);
  font-size: var(--fz-xs);
  text-align: left;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 0 15px 2px;
  }
  @media (max-width: 600px) {
    ${({ theme }) => theme.mixins.flexCenter};
    min-width: 120px;
    padding: 0 15px;
    border-left: 0;
    border-bottom: 2px solid var(--lightest-navy);
    text-align: center;
  }

  &:hover,
  &:focus {
    background-color: var(--light-navy);
  }
`;

const StyledHighlight = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 2px;
  height: var(--tab-height);
  border-radius: var(--border-radius);
  background: var(--green);
  transform: translateY(calc(${({ activeTabId }) => activeTabId} * var(--tab-height)));
  transition: transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
  transition-delay: 0.1s;

  @media (max-width: 600px) {
    top: auto;
    bottom: 0;
    width: 100%;
    max-width: var(--tab-width);
    height: 2px;
    margin-left: 50px;
    transform: translateX(calc(${({ activeTabId }) => activeTabId} * var(--tab-width)));
  }
  @media (max-width: 480px) {
    margin-left: 25px;
  }
`;

const StyledTabPanels = styled.div`
  position: relative;
  width: 100%;
  margin-left: 20px;

  @media (max-width: 600px) {
    margin-left: 0;
  }
`;

const StyledTabPanel = styled.div`
  width: 100%;
  height: auto;
  padding: 10px 5px;

  ul {
    ${({ theme }) => theme.mixins.fancyList};
  }

  h3 {
    margin-bottom: 2px;
    font-size: var(--fz-xxl);
    font-weight: 500;
    line-height: 1.3;

    .company {
      color: var(--green);
    }
  }

  .range {
    margin-bottom: 25px;
    color: var(--light-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
  }
`;

const StyledSubTabs = styled.div`
  margin-bottom: 20px;

  .sub-tab-list {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    border-bottom: 1px solid var(--lightest-navy);
  }

  .sub-tab-button {
    ${({ theme }) => theme.mixins.link};
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: ${(props) => (props['data-active'] === true ? 'var(--green)' : 'var(--slate)')};
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
    border-bottom: 2px solid
      ${(props) => (props['data-active'] === true ? 'var(--green)' : 'transparent')};
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);

    &:hover {
      color: var(--green);
    }
  }
`;

const Jobs = () => {
  const data = useStaticQuery(graphql`
    query {
      jobs: allMarkdownRemark(
        filter: { fileAbsolutePath: { regex: "/content/jobs/" } }
        sort: { frontmatter: { date: DESC } }
      ) {
        edges {
          node {
            frontmatter {
              title
              company
              location
              range
              url
              parent
            }
            html
          }
        }
      }
    }
  `);

  const jobsData = data.jobs.edges;

  // Group Wells Fargo jobs and separate others
  const wellsFargoJobs = jobsData.filter(({ node }) => node.frontmatter.parent === 'Wells Fargo');
  const otherJobs = jobsData.filter(({ node }) => !node.frontmatter.parent);

  // Create main tabs data (Wells Fargo as one tab, others individual)
  const mainTabs = [
    {
      company: 'Wells Fargo',
      isGroup: true,
      jobs: wellsFargoJobs,
    },
    ...otherJobs.map((job) => ({
      company: job.node.frontmatter.company,
      isGroup: false,
      jobs: [job],
    })),
  ];

  const [activeTabId, setActiveTabId] = useState(0);
  const [activeSubTabId, setActiveSubTabId] = useState(0);
  const [tabFocus, setTabFocus] = useState(null);
  const tabs = useRef([]);
  const revealContainer = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    sr.reveal(revealContainer.current, srConfig());
  }, [prefersReducedMotion]);

  const focusTab = useCallback(() => {
    if (tabs.current[tabFocus]) {
      tabs.current[tabFocus].focus();
      return;
    }
    // If we're at the end, go to the start
    if (tabFocus >= tabs.current.length) {
      setTabFocus(0);
    }
    // If we're at the start, move to the end
    if (tabFocus < 0) {
      setTabFocus(tabs.current.length - 1);
    }
  }, [tabFocus]);

  // Only re-run the effect if tabFocus changes
  useEffect(() => focusTab(), [tabFocus, focusTab]);

  // Focus on tabs when using up & down arrow keys
  const onKeyDown = (e) => {
    switch (e.key) {
      case KEY_CODES.ARROW_UP: {
        e.preventDefault();
        setTabFocus(tabFocus - 1);
        break;
      }

      case KEY_CODES.ARROW_DOWN: {
        e.preventDefault();
        setTabFocus(tabFocus + 1);
        break;
      }

      default: {
        break;
      }
    }
  };

  // Reset sub-tab when main tab changes
  useEffect(() => {
    setActiveSubTabId(0);
  }, [activeTabId]);

  return (
    <StyledJobsSection id="jobs" ref={revealContainer}>
      <h2 className="numbered-heading">Where I’ve Worked</h2>

      <div className="inner">
        <StyledTabList role="tablist" aria-label="Job tabs" onKeyDown={(e) => onKeyDown(e)}>
          {mainTabs &&
            mainTabs.map((tab, i) => (
              <StyledTabButton
                key={i}
                data-active={activeTabId === i}
                onClick={() => setActiveTabId(i)}
                ref={(el) => (tabs.current[i] = el)}
                id={`tab-${i}`}
                role="tab"
                tabIndex={activeTabId === i ? '0' : '-1'}
                aria-selected={activeTabId === i ? true : false}
                aria-controls={`panel-${i}`}
              >
                <span>{tab.company}</span>
              </StyledTabButton>
            ))}
          <StyledHighlight activeTabId={activeTabId} />
        </StyledTabList>

        <StyledTabPanels>
          {mainTabs &&
            mainTabs.map((tab, i) => {
              const currentTab = mainTabs[activeTabId];
              const isWellsFargo = currentTab?.isGroup;
              const currentJob = isWellsFargo
                ? currentTab.jobs[activeSubTabId]?.node
                : currentTab.jobs[0]?.node;

              if (!currentJob) {
                return null;
              }

              const { frontmatter, html } = currentJob;
              const { title, url, company, range } = frontmatter;

              return (
                <CSSTransition key={i} in={activeTabId === i} timeout={250} classNames="fade">
                  <StyledTabPanel
                    id={`panel-${i}`}
                    role="tabpanel"
                    tabIndex={activeTabId === i ? '0' : '-1'}
                    aria-labelledby={`tab-${i}`}
                    aria-hidden={activeTabId !== i}
                    hidden={activeTabId !== i}
                  >
                    {isWellsFargo && (
                      <StyledSubTabs>
                        <div className="sub-tab-list">
                          {currentTab.jobs.map((job, subIndex) => (
                            <button
                              key={subIndex}
                              className="sub-tab-button"
                              data-active={activeSubTabId === subIndex}
                              onClick={() => setActiveSubTabId(subIndex)}
                              style={{
                                color:
                                  activeSubTabId === subIndex ? 'var(--green)' : 'var(--slate)',
                                borderBottomColor:
                                  activeSubTabId === subIndex ? 'var(--green)' : 'transparent',
                              }}
                            >
                              {job.node.frontmatter.range.split(' - ')[0].split(' ')[1]}{' '}
                              {/* Extract year */}
                            </button>
                          ))}
                        </div>
                      </StyledSubTabs>
                    )}

                    <h3>
                      <span>{title}</span>
                      <span className="company">
                        &nbsp;@&nbsp;
                        <a href={url} className="inline-link">
                          {company}
                        </a>
                      </span>
                    </h3>

                    <p className="range">{range}</p>

                    <div dangerouslySetInnerHTML={{ __html: html }} />
                  </StyledTabPanel>
                </CSSTransition>
              );
            })}
        </StyledTabPanels>
      </div>
    </StyledJobsSection>
  );
};

export default Jobs;
