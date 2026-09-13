import axios from "axios";
import instance from "../axios";

const users = {
  state: () => ({}),

  actions: {
    getUsers: async () => {
      try {
        const res = await instance.get("users");
        return res;
      } catch (err) {
        return err;
      }
    },
    getLengthUsers: async () => {
      try {
        const res = await instance.get("users/length");

        return res.data.length;
      } catch (err) {
        return err;
      }
    },
    createUser: async (test, data) => {
      try {
        const res = await instance.post("users/create", data);
        return res.request.status;
      } catch (err) {
        console.log(err);
        return err;
      }
    },
    async getUser() {
      try {
        const res = await instance.get("users/user");
        return res;
      } catch (err) {
        return err;
      }
    },
    async updateUser(test, data) {
      try {
        const res = await instance.put(`users/update/${data.id}`, data);
        return res;
      } catch (err) {
        return err;
      }
    },
    async updateRole(t, user) {
      try {
        console.log(user);
        const res = await instance.put(`users/update/${user.id}`, user);
        return res;
      } catch (err) {
        return err;
      }
    },
    async updateAvatar(test, data) {
      const form = new FormData();
      form.append("image", data.image);
      try {
        // The upload host and its key come from configuration, never from a
        // literal in the bundle. This template shipped with a live imgbb key
        // hardcoded on this line; anything checked in here is readable by
        // everyone who loads the page, so there is no safe value to inline.
        // Unset, the request stays in the page and the demo adapter answers it.
        const res = await axios.post(
          process.env.VUE_APP_IMAGE_UPLOAD_URL || "https://api.imgbb.com/1/upload",
          form
        );
        // const imgUrl = res.data.data.display_url;
        if (res.status === 200) {
          const _res = await instance.put(`users/update/avatar/${data.id}`, {
            imgUrl: res.data.data.display_url,
          });
          return _res.status;
        }
        return 400;
      } catch (err) {
        return err;
      }
    },
  },
};

export default users;
