import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import distanceInWords from "date-fns/distance_in_words_strict";
import format from "date-fns/format";

import DevmodeIcon, { isInDevmode } from "./devmodeIcon";
import Notification from "./notification";
import {
  AVAILABLE,
  AVAILABLE_REVISIONS_SELECT_UNRELEASED,
  AVAILABLE_REVISIONS_SELECT_RECENT,
  AVAILABLE_REVISIONS_SELECT_ALL
} from "./constants";

import { closeHistory } from "./actions/history";
import { toggleRevision } from "./actions/channelMap";
import {
  getFilteredReleaseHistory,
  getSelectedRevisions,
  getSelectedArchitectures,
  getSelectedAvailableRevisions,
  getSelectedAvailableRevisionsForArch
} from "./selectors";

import { getPendingRelease } from "./releasesState";

class RevisionsList extends Component {
  revisionSelectChange(revision) {
    this.props.toggleRevision(revision);
  }

  renderRow(revision, isSelectable, showAllColumns, isPending) {
    const revisionDate = revision.release
      ? new Date(revision.release.when)
      : new Date(revision.created_at);
    const isSelected = this.props.selectedRevisions.includes(revision.revision);

    // disable revisions from the same architecture that already selected
    // but only if checkboxes are visible (not in channel history)
    const isDisabled =
      isSelectable &&
      !isSelected &&
      revision.architectures.some(arch =>
        this.props.selectedArchitectures.includes(arch)
      );

    const id = `revision-check-${revision.revision}`;
    const className = `${isDisabled ? "is-disabled" : ""} ${
      isSelectable ? "is-clickable" : ""
    } ${isPending ? "is-pending" : ""}`;

    return (
      <tr
        key={id}
        className={className}
        onClick={
          isSelectable ? this.revisionSelectChange.bind(this, revision) : null
        }
      >
        <td>
          {isSelectable ? (
            <Fragment>
              <input
                type="checkbox"
                checked={isSelected}
                id={id}
                onChange={this.revisionSelectChange.bind(this, revision)}
              />
              <label className="u-no-margin--bottom" htmlFor={id}>
                {revision.revision}
              </label>
            </Fragment>
          ) : (
            <span>{revision.revision}</span>
          )}
        </td>
        <td>
          <DevmodeIcon revision={revision} showTooltip={true} />
        </td>
        <td>{revision.version}</td>
        {showAllColumns && <td>{revision.channels.join(", ")}</td>}
        <td className="u-align--right">
          {isPending ? (
            <em>pending release</em>
          ) : (
            <span
              className="p-tooltip p-tooltip--btm-center"
              aria-describedby={`revision-uploaded-${revision.revision}`}
            >
              {distanceInWords(new Date(), revisionDate, { addSuffix: true })}
              <span
                className="p-tooltip__message u-align--center"
                role="tooltip"
                id={`revision-uploaded-${revision.revision}`}
              >
                {format(revisionDate, "YYYY-MM-DD HH:mm")}
              </span>
            </span>
          )}
        </td>
      </tr>
    );
  }

  renderRows(revisions, isSelectable, showAllColumns) {
    return revisions.map(revision => {
      return this.renderRow(revision, isSelectable, showAllColumns);
    });
  }

  onCloseClick(event) {
    event.preventDefault();
    this.props.closeHistoryPanel();
  }

  render() {
    let {
      availableRevisionsSelect,
      showAllColumns,
      selectedAvailableRevisions
    } = this.props;
    let filteredRevisions = selectedAvailableRevisions;
    let title = "Latest revisions";
    let filters = this.props.filters;
    let isReleaseHistory = false;
    let pendingRelease = null;

    if (filters && filters.arch) {
      if (filters.risk === AVAILABLE) {
        filteredRevisions = this.props.getSelectedAvailableRevisionsForArch(
          filters.arch
        );

        if (availableRevisionsSelect === AVAILABLE_REVISIONS_SELECT_ALL) {
          title = (
            <Fragment>
              Latest revisions for <b>{filters.arch}</b>
            </Fragment>
          );
        } else if (
          availableRevisionsSelect === AVAILABLE_REVISIONS_SELECT_UNRELEASED
        ) {
          title = (
            <Fragment>
              Unreleased revisions for <b>{filters.arch}</b>
            </Fragment>
          );
        } else if (
          availableRevisionsSelect === AVAILABLE_REVISIONS_SELECT_RECENT
        ) {
          title = (
            <Fragment>
              Recent unreleased revisions for <b>{filters.arch}</b>
            </Fragment>
          );
        }
      } else {
        // when listing any other (real) channel, show filtered release history
        isReleaseHistory = true;
        title = (
          <Fragment>
            Releases history for <b>{filters.arch}</b> in{" "}
            <b>
              {filters.track}/{filters.risk}
            </b>
          </Fragment>
        );

        filteredRevisions = this.props.filteredReleaseHistory;

        pendingRelease = getPendingRelease(
          this.props.pendingReleases,
          filters.arch,
          `${filters.track}/${filters.risk}`
        );

        if (pendingRelease) {
          pendingRelease = this.props.revisions[pendingRelease];
        }
      }
    }

    const hasDevmodeRevisions = filteredRevisions.some(isInDevmode);
    return (
      <Fragment>
        <div className="u-clearfix">
          <h4 className="u-float--left">{title}</h4>
          <a
            style={{ marginTop: "0.5rem" }}
            href="#"
            onClick={this.onCloseClick.bind(this)}
            className="p-icon--close u-float--right"
          />
        </div>
        {hasDevmodeRevisions && (
          <Notification>
            Revisions in development mode cannot be released to stable or
            candidate channels.
            <br />
            You can read more about{" "}
            <a href="https://docs.snapcraft.io/t/snap-confinement/6233">
              <code>devmode</code> confinement
            </a>{" "}
            and{" "}
            <a href="https://docs.snapcraft.io/t/snapcraft-yaml-reference/4276">
              <code>devel</code> grade
            </a>
            .
          </Notification>
        )}
        <table className="p-revisions-list">
          <thead>
            <tr>
              <th
                className={!isReleaseHistory ? "col-checkbox-spacer" : ""}
                width="150px"
                scope="col"
              >
                Revision
              </th>
              <th width="20px" />
              <th scope="col">Version</th>
              {showAllColumns && <th scope="col">Channels</th>}
              <th scope="col" width="130px" className="u-align--right">
                {isReleaseHistory ? "Release date" : "Submission date"}
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingRelease &&
              this.renderRow(
                pendingRelease,
                !isReleaseHistory,
                showAllColumns,
                true
              )}
            {filteredRevisions.length > 0 ? (
              this.renderRows(
                filteredRevisions,
                !isReleaseHistory,
                showAllColumns
              )
            ) : (
              <tr>
                <td colSpan="4">
                  <em>No releases</em>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

RevisionsList.propTypes = {
  // state
  revisions: PropTypes.object.isRequired,
  filters: PropTypes.object,
  pendingReleases: PropTypes.object.isRequired,
  availableRevisionsSelect: PropTypes.string.isRequired,

  // computed state (selectors)
  showAllColumns: PropTypes.bool,
  filteredReleaseHistory: PropTypes.array,
  selectedRevisions: PropTypes.array.isRequired,
  selectedArchitectures: PropTypes.array.isRequired,
  selectedAvailableRevisions: PropTypes.array.isRequired,
  getSelectedAvailableRevisionsForArch: PropTypes.func.isRequired,

  // actions
  closeHistoryPanel: PropTypes.func.isRequired,
  toggleRevision: PropTypes.func.isRequired
};

const mapStateToProps = state => {
  return {
    availableRevisionsSelect: state.availableRevisionsSelect,
    showAllColumns:
      !state.history.filters ||
      (state.history.filters &&
        state.history.filters.risk === AVAILABLE &&
        state.availableRevisionsSelect === AVAILABLE_REVISIONS_SELECT_ALL),
    filters: state.history.filters,
    revisions: state.revisions,
    pendingReleases: state.pendingReleases,
    selectedRevisions: getSelectedRevisions(state),
    filteredReleaseHistory: getFilteredReleaseHistory(state),
    selectedArchitectures: getSelectedArchitectures(state),
    selectedAvailableRevisions: getSelectedAvailableRevisions(state),
    getSelectedAvailableRevisionsForArch: arch =>
      getSelectedAvailableRevisionsForArch(state, arch)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    closeHistoryPanel: () => dispatch(closeHistory()),
    toggleRevision: revision => dispatch(toggleRevision(revision))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RevisionsList);
