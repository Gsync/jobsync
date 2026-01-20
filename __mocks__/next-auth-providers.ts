const Credentials = jest.fn((config: any) => ({
  id: "credentials",
  name: "Credentials",
  type: "credentials",
  credentials: config?.credentials || {},
  authorize: config?.authorize || jest.fn(),
}));

export default Credentials;
