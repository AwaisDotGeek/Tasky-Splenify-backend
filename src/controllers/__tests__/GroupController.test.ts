import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { GroupController } from '../GroupController';
import { groupService } from '../../services/GroupService';

jest.mock('../../services/GroupService');

describe('GroupController', () => {
  let groupController: GroupController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    groupController = new GroupController();
    mockRequest = {
      user: { id: 'user123', email: 'test@example.com' },
      params: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create group with members', async () => {
      mockRequest.body = {
        name: 'Test Group',
        memberIds: ['user456', 'user789']
      };

      const mockGroup = {
        id: 'group123',
        name: 'Test Group',
        memberIds: ['user123', 'user456', 'user789']
      };

      (groupService.createGroup as jest.Mock).mockResolvedValue(mockGroup);

      await groupController.createGroup(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.createGroup).toHaveBeenCalledWith(
        'Test Group',
        'user123',
        ['user456', 'user789']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { group: mockGroup }
      });
    });

    it('should create group without memberIds in body', async () => {
      mockRequest.body = { name: 'Test Group' };

      (groupService.createGroup as jest.Mock).mockResolvedValue({});

      await groupController.createGroup(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.createGroup).toHaveBeenCalledWith(
        'Test Group',
        'user123',
        []
      );
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Failed to create group');
      (groupService.createGroup as jest.Mock).mockRejectedValue(error);

      await groupController.createGroup(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserGroups', () => {
    it('should return user groups', async () => {
      const mockGroups = [
        { id: 'group1', name: 'Group 1' },
        { id: 'group2', name: 'Group 2' }
      ];

      (groupService.getUserGroups as jest.Mock).mockResolvedValue(mockGroups);

      await groupController.getUserGroups(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.getUserGroups).toHaveBeenCalledWith('user123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { groups: mockGroups }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Failed to fetch groups');
      (groupService.getUserGroups as jest.Mock).mockRejectedValue(error);

      await groupController.getUserGroups(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getGroup', () => {
    it('should return group by id', async () => {
      mockRequest.params = { id: 'group123' };
      const mockGroup = { id: 'group123', name: 'Test Group' };

      (groupService.getGroup as jest.Mock).mockResolvedValue(mockGroup);

      await groupController.getGroup(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.getGroup).toHaveBeenCalledWith('group123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { group: mockGroup }
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { id: 'group123' };
      const error = new Error('Group not found');
      (groupService.getGroup as jest.Mock).mockRejectedValue(error);

      await groupController.getGroup(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addMembers', () => {
    it('should add members to group', async () => {
      mockRequest.params = { id: 'group123' };
      mockRequest.body = { memberIds: ['user456', 'user789'] };

      const mockGroup = { id: 'group123', memberIds: ['user123', 'user456', 'user789'] };

      (groupService.addMembers as jest.Mock).mockResolvedValue(mockGroup);

      await groupController.addMembers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.addMembers).toHaveBeenCalledWith(
        'group123',
        ['user456', 'user789']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { group: mockGroup }
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { id: 'group123' };
      const error = new Error('Failed to add members');
      (groupService.addMembers as jest.Mock).mockRejectedValue(error);

      await groupController.addMembers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      mockRequest.params = { id: 'group123', userId: 'user456' };

      const mockGroup = { id: 'group123', memberIds: ['user123'] };

      (groupService.removeMember as jest.Mock).mockResolvedValue(mockGroup);

      await groupController.removeMember(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(groupService.removeMember).toHaveBeenCalledWith('group123', 'user456');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { group: mockGroup }
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { id: 'group123', userId: 'user456' };
      const error = new Error('Failed to remove member');
      (groupService.removeMember as jest.Mock).mockRejectedValue(error);

      await groupController.removeMember(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
