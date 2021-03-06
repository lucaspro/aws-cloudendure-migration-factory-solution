import React, { Component } from "react";
import { Auth } from "aws-amplify";
import User from "../actions/user";
import Admin from "../actions/admin";
import NavBar from "../components/NavBar";
import UserListNav from "../components/UserListNav";
import UserListServers from "../components/UserListServers"
import AppDialog from "../components/AppDialog";

export default class UserServers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: props.isAuthenticated,
      isLoading: true,
      activeNav: 'servers',
      servers: [],
      apps: [],
      waves: [],
      jwt: {},
      roles: [],
      stages: [],
      allowedCreate: false,
      showDialog: false,
      msg: ''
    };
  }

  decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const decodedJwt = JSON.parse(window.atob(base64));
    this.setState({jwt: decodedJwt});
  }

  async componentDidMount() {
    const session = await Auth.currentSession();
    const token = session.idToken.jwtToken;
    this.apiAdmin = await new Admin(session);
    this.apiUser = await new User(session);
    this.getServers();
    this.getWaves();
    this.getApps();
    this.decodeJwt(token);
    this.getPermissions();

    this.setState({ isLoading: false });
  }

  async getPermissions() {
    try {
      const response1 = await this.apiAdmin.getStages();
      this.setState({ stages : response1});
      const response2 = await this.apiAdmin.getRoles();
      this.setState({ roles : response2});

      var allowedCreate = false;


      // Additional processing once all data has loaded
      if (this.state.stages.length > 0 &&
        this.state.roles.length > 0 &&
        Object.keys(this.state.jwt).length > 0){
        // Get list of stages user is authorized for
        const userGroups = this.state.jwt['cognito:groups'];
        for (var role in this.state.roles) {
          for (var group in this.state.roles[role].groups) {
            const role_group = this.state.roles[role].groups[group].group_name
            if (userGroups.includes(role_group)) {
              for (var stage in this.state.roles[role].stages) {
                const allowedStage = this.state.roles[role].stages[stage].stage_id;
                  if (allowedStage.toString() === '1') {
                    allowedCreate = true
                  }
              }
            }
          }
        }
        if (allowedCreate === true) {
        this.setState({
          allowedCreate: true
        });
      }
      else {
        this.setState({
          showDialog: true,
          msg: "You are not authorizaed to manage server list"
        });
      }
      }
    } catch (e) {
      console.log(e);
      if ('response' in e && 'data' in e.response) {
        this.showError(e.response.data);
      } else{
        console.log()
        this.showError('Unknown error occured')
      }
    }
  }

  onClickUpdate = event => {
    this.setState({
      showDialog: false
    });
    this.props.history.push("/");
  }

  async getServers(session) {
    try {
      const response = await this.apiUser.getServers();
      this.setState({ servers : response});

    } catch (e) {
      console.log(e);
      if ('data' in e.response) {
        this.props.showError(e.response.data);
      }
    }
  }

  async getApps(session) {
    try {
      const response = await this.apiUser.getApps();
      this.setState({ apps : response});

    } catch (e) {
      console.log(e);
      if ('data' in e.response) {
        this.props.showError(e.response.data);
      }
    }
  }

  async getWaves() {
    try {
      const response = await this.apiUser.getWaves();
      this.setState({ waves : response});

    } catch (e) {
      console.log(e);
      if ('data' in e.response) {
        this.props.showError(e.response.data);
      }
    }
  }

  onClickReload = event => {
    this.setState({ isLoading: true , servers: []});
    this.getServers();
    this.setState({ isLoading: false });
  }

  onClickChangeActiveNav = event => {
    event.preventDefault();
    switch(event.target.id) {
      case 'servers':
        this.props.history.push("/servers");
        break;
      case 'apps':
        this.props.history.push("/apps");
        break;
      case 'waves':
        this.props.history.push("/waves");
        break;
      default:
        break;
    }
  }

  updateServerList = (action, server_id) => {
    switch(action) {
      case 'refresh':
        this.getServers()
        break;

      case 'delete':
        var newServers = [];
        for ( var i in this.state.servers) {
          if (server_id !== this.state.servers[i].server_id) {
            newServers.push(this.state.servers[i]);
          }
        }
        this.setState({
          servers: newServers
        });
        break;

      default:
    }

  }

  render() {
    if (!this.state.isAuthenticated){
      this.props.history.push("/login");
    }

    if (!this.state.allowedCreate) {
      return (
        <div>
        <AppDialog
        showDialog={this.state.showDialog}
        msg={this.state.msg}
        onClickUpdate={this.onClickUpdate}
      />
      </div>
      )
    }

    else {
    return (
      <div>
        <NavBar
          onClick={this.props.onClickMenu}
          selection="Resource List"
        />
        <UserListNav onClick={this.onClickChangeActiveNav} active={this.state.activeNav}/>

        <div className="container-fluid pt-5 px-5">
          <UserListServers
            servers={this.state.servers}
            apps={this.state.apps}
            waves={this.state.waves}
            isLoading={this.state.isLoading}
            updateServerList={this.updateServerList}
            showError={this.props.showError}
            onClickReload={this.onClickReload}
          />
        </div>
      </div>
    );
    }
  }
}
