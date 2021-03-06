/* eslint-disable  no-prototype-builtins */
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { fetchUserInfo } from '../actions';
import { fetchSocietyInfo } from '../actions/societyInfoActions';
import { changeTitle } from '../actions/pageActions';
import { fetchUserProfile } from '../actions/userProfileActions';
import { openModal, closeModal } from '../actions/showModalActions';

import Header from '../components/header/Header';
import SocietyBanner from '../components/header/SocietyBanner';
import Sidebar from '../components/sidebar/Sidebar';
import LogActivityForm from './forms/LogActivityForm';
import FloatingButton from '../common/FloatingButton';
import UpdateLoader from '../components/loaders/UpdateLoader';
import Modal from '../common/Modal';
import RedeemPointsForm from './forms/RedeemPointsForm';
import CommentsForm from './forms/CommentsForm';
import CreateCategoryForm from './forms/CreateCategoryForm';

import { STAFF_USERS, SOCIETY_PRESIDENT, SUCCESS_OPS } from '../../src/constants/roles';

import {
  getToken, tokenIsValid, isFellow,
  setSignInError, decodeToken, getUserInfo,
  hasAllowedRole,
} from '../helpers/authentication';
import pageInfo from '../helpers/pageInfo';

/**
 * @name Page
 * @summary Renders the entire application
 * @return {jsx} React node for the entire application
 */

class Page extends Component {
  /**
   * @name propTypes
   * @type {PropType}
   * @param {Object} propTypes - React PropTypes
   * @property {Object} history - React router history object
  */
  static propTypes = {
    fetchUserInfo: PropTypes.func.isRequired,
    fetchSocietyInfo: PropTypes.func.isRequired,
    fetchUserProfile: PropTypes.func.isRequired,
    updateSelectedItem: PropTypes.func,
    userInfo: PropTypes.shape({
      name: PropTypes.string,
      picture: PropTypes.string,
    }).isRequired,
    societyInfo: PropTypes.shape({
      requesting: PropTypes.bool.isRequired,
      error: PropTypes.shape({}).isRequired,
      info: PropTypes.shape({
        name: PropTypes.string.isRequired,
        remainingPoints: PropTypes.number.isRequired,
        image: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    history: PropTypes.shape({
      push: PropTypes.func,
      location: PropTypes.shape({
        pathname: PropTypes.string,
        search: PropTypes.string,
      }),
    }),
    changeTitle: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    location: PropTypes.shape({ pathname: PropTypes.string.isRequired }).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({})),
    profile: PropTypes.shape({
      society: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }),
    }),
    updating: PropTypes.bool,
    deselectItem: PropTypes.func,
    openModal: PropTypes.func,
    closeModal: PropTypes.func,
    selectedItem: PropTypes.shape({}),
  }

  static defaultProps = {
    categories: [],
    profile: null,
    history: {
      push: () => {},
      location: {
        pathname: '',
        search: '',
      },
    },
    updating: false,
    selectedItem: {},
    deselectItem: () => { },
    updateSelectedItem: () => { },
    openModal: () => {},
    closeModal: () => {},
  }

  static getDerivedStateFromProps = (props) => {
    const { showModal } = props;
    return ({ showModal });
  }

  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
    props.changeTitle(props.history.location.pathname);
  }

  componentDidMount() {
    const token = getToken();
    const tokenInfo = decodeToken(token);
    if (token === null || tokenIsValid(tokenInfo) === false || isFellow(tokenInfo) === false) {
      setSignInError();
      this.props.history.push({ pathname: '/', search: '?error=unauthorized' });
    }
    this.props.fetchUserInfo(tokenInfo);
    const userId = getUserInfo() && getUserInfo().id;
    this.props.fetchUserProfile(userId);
    if (this.isASocietyPage()) {
      const societyName = this.props.location.pathname.split('/').pop();
      this.props.fetchSocietyInfo(societyName);
    }
  }

  onFabClick = (event) => {
    if (event.type === 'keydown' && event.keyCode !== 13) {
      return;
    }
    if (document && document.body) {
      document.body.classList.add('noScroll');
    }
    this.props.openModal();
  }

  isASocietyPage = () => (
    this.props.location.pathname.indexOf('society') !== -1
  );

  closeModal = () => {
    if (document && document.body) {
      document.body.classList.remove('noScroll');
    }
    this.props.closeModal();
    if (this.props.selectedItem) {
      this.props.deselectItem();
    }
  }

  renderFloatingButton = () => {
    const { profile, location } = this.props;
    const { showModal } = this.state;
    const userRoles = Object.keys(profile.roles);
    let FAB;
    if (location.pathname === '/u/categories' && hasAllowedRole(userRoles, SUCCESS_OPS)) {
      FAB = <FloatingButton onClick={this.onFabClick} />;
    } else if (showModal ||
        hasAllowedRole(userRoles, STAFF_USERS)
        || !userRoles.length
        || location.pathname === '/u/verify-activities'
        || location.pathname.match(/\/society\/[a-z]+/)) {
      FAB = '';
    } else {
      FAB = <FloatingButton onClick={this.onFabClick} />;
    }
    return (FAB);
  }

  renderModal = () => {
    const {
      categories,
      location,
      profile,
      selectedItem,
      updateSelectedItem,
    } = this.props;

    const className = this.state.showModal ? 'modal--open' : '';
    let modalContent;
    if (location.pathname === '/u/my-activities') {
      modalContent = (categories.length &&
      <LogActivityForm
        categories={categories}
        showModal={this.state.showModal}
        closeModal={this.closeModal}
        selectedItem={selectedItem}
        updateSelectedItem={updateSelectedItem}
      />);
    } else if (location.pathname === '/u/redemptions' &&
      hasAllowedRole(Object.keys(profile.roles), [SOCIETY_PRESIDENT])) {
      modalContent = (
        <RedeemPointsForm
          closeModal={this.closeModal}
          showModal={this.state.showModal}
          selectedItem={selectedItem}
          updateSelectedItem={updateSelectedItem}
        />
      );
    } else if (location.pathname === '/u/categories' &&
      hasAllowedRole(Object.keys(profile.roles), SUCCESS_OPS)
    ) {
      modalContent = (
        <CreateCategoryForm
          showModal={this.state.showModal}
          closeModal={this.closeModal}
          selectedItem={selectedItem}
        />);
    } else if (hasAllowedRole(Object.keys(profile.roles), STAFF_USERS)) {
      modalContent = (
        <CommentsForm
          showModal={this.state.showModal}
          closeModal={this.closeModal}
          selectedItem={selectedItem}
        />);
    }
    return (
      <Modal close={this.closeModal} className={className}>
        {
          modalContent
        }
      </Modal>
    );
  }

  render() {
    const {
      userInfo,
      societyInfo,
      profile,
      updating,
    } = this.props;
    const userRoles = Object.keys(profile.roles);
    return (
      <Fragment>
        <div className='headerBackground' />
        <div className='sidebarWrapper sidebarWrapper--sidebarOpen'>
          <Sidebar userRoles={userRoles} pageInfo={pageInfo} />
        </div>
        <main className='mainPage mainPage--sidebarOpen'>
          {this.isASocietyPage() ? <SocietyBanner society={societyInfo.info} /> : null}
          {updating && <div className='overlay'><UpdateLoader /></div>}
          <div className='pageContent'>
            <Header
              history={this.props.history}
              userInfo={userInfo}
              profile={profile}
              societyBanner={this.isASocietyPage()}
            />
            <div className={`contentWrapper ${(this.isASocietyPage() ? 'contentWrapper--society' : '')}`}>
              {this.props.children}
            </div>
          </div>
        </main>
        {this.renderModal()}
        {this.renderFloatingButton()}
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const updating = state.societyActivities.updating || state.redeemPointsInfo.updating || state.categories.updating;
  return ({
    showModal: state.modalInfo.showModal,
    userInfo: state.userInfo,
    societyInfo: state.societyInfo,
    profile: state.userProfile.info,
    updating,
  });
};

export default connect(mapStateToProps, {
  changeTitle,
  fetchUserInfo,
  fetchSocietyInfo,
  fetchUserProfile,
  openModal,
  closeModal,
})(withRouter(Page));
