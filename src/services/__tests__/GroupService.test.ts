import { GroupService } from '../GroupService';
import { Group } from '../../models/Group';
import mongoose from 'mongoose';

jest.mock('../../models/Group');

describe('GroupService', () => {
  let groupService: GroupService;
  const validUserId1 = new mongoose.Types.ObjectId().toString();
  const validUserId2 = new mongoose.Types.ObjectId().toString();
  const validUserId3 = new mongoose.Types.ObjectId().toString();
  const validGroupId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    groupService = new GroupService();
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group with valid inputs', async () => {
      const mockGroup = {
        _id: validGroupId,
        name: 'Test Group',
        creatorId: validUserId1,
        memberIds: [validUserId1, validUserId2, validUserId3],
        populate: jest.fn().mockResolvedValue({
          _id: validGroupId,
          name: 'Test Group',
          memberIds: [
            { _id: validUserId1, name: 'User 1' },
            { _id: validUserId2, name: 'User 2' },
            { _id: validUserId3, name: 'User 3' }
          ]
        })
      };

      (Group.create as jest.Mock).mockResolvedValue(mockGroup);

      const result = await groupService.createGroup('Test Group', validUserId1, [validUserId2, validUserId3]);

      expect(Group.create).toHaveBeenCalledWith({
        name: 'Test Group',
        creatorId: expect.any(Object),
        memberIds: expect.arrayContaining([expect.any(Object)])
      });
      expect(result).toBeDefined();
    });

    it('should include creator in members list', async () => {
      const mockGroup = {
        populate: jest.fn().mockResolvedValue({})
      };
      (Group.create as jest.Mock).mockResolvedValue(mockGroup);

      await groupService.createGroup('Test Group', validUserId1, [validUserId2]);

      const createCall = (Group.create as jest.Mock).mock.calls[0][0];
      expect(createCall.memberIds).toHaveLength(2);
    });

    it('should throw error for empty name', async () => {
      await expect(groupService.createGroup('', validUserId1, [validUserId2]))
        .rejects
        .toThrow('Group name is required');
    });

    it('should throw error for name exceeding 100 characters', async () => {
      const longName = 'a'.repeat(101);
      await expect(groupService.createGroup(longName, validUserId1, [validUserId2]))
        .rejects
        .toThrow('Group name must not exceed 100 characters');
    });

    it('should throw error for less than 2 members', async () => {
      await expect(groupService.createGroup('Test', validUserId1, []))
        .rejects
        .toThrow('Group must have at least 2 members');
    });

    it('should throw error for more than 50 members', async () => {
      const manyMembers = Array.from({ length: 50 }, () => new mongoose.Types.ObjectId().toString());
      await expect(groupService.createGroup('Test', validUserId1, manyMembers))
        .rejects
        .toThrow('Group cannot have more than 50 members');
    });

    it('should remove duplicate member IDs', async () => {
      const mockGroup = {
        populate: jest.fn().mockResolvedValue({})
      };
      (Group.create as jest.Mock).mockResolvedValue(mockGroup);

      await groupService.createGroup('Test', validUserId1, [validUserId2, validUserId2, validUserId1]);

      const createCall = (Group.create as jest.Mock).mock.calls[0][0];
      expect(createCall.memberIds).toHaveLength(2);
    });
  });

  describe('getGroup', () => {
    it('should return group by ID', async () => {
      const mockGroup = {
        _id: validGroupId,
        name: 'Test Group',
        populate: jest.fn().mockResolvedValue({
          _id: validGroupId,
          name: 'Test Group'
        })
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockGroup.populate())
      };

      (Group.findById as jest.Mock).mockReturnValue(mockQuery);

      const result = await groupService.getGroup(validGroupId);

      expect(Group.findById).toHaveBeenCalledWith(validGroupId);
      expect(result).toBeDefined();
    });

    it('should throw error if group not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null)
      };

      (Group.findById as jest.Mock).mockReturnValue(mockQuery);

      await expect(groupService.getGroup('nonexistent'))
        .rejects
        .toThrow('Group not found');
    });
  });

  describe('getUserGroups', () => {
    it('should return all groups for a user', async () => {
      const mockGroups = [
        { _id: 'group1', name: 'Group 1' },
        { _id: 'group2', name: 'Group 2' }
      ];

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockGroups)
      };

      (Group.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await groupService.getUserGroups(validUserId1);

      expect(Group.find).toHaveBeenCalledWith({
        memberIds: expect.any(Object)
      });
      expect(result).toEqual(mockGroups);
    });
  });

  describe('addMembers', () => {
    it('should add new members to group', async () => {
      const mockGroup = {
        _id: validGroupId,
        memberIds: [{ equals: jest.fn().mockReturnValue(false) }],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      await groupService.addMembers(validGroupId, [validUserId2, validUserId3]);

      expect(mockGroup.memberIds).toHaveLength(3);
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should throw error if group not found', async () => {
      (Group.findById as jest.Mock).mockResolvedValue(null);

      await expect(groupService.addMembers('nonexistent', [validUserId2]))
        .rejects
        .toThrow('Group not found');
    });

    it('should throw error if adding members exceeds 50', async () => {
      const existingMembers = Array.from({ length: 48 }, () => ({
        equals: jest.fn().mockReturnValue(false)
      }));

      const mockGroup = {
        memberIds: existingMembers,
        save: jest.fn()
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      const newMembers = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];

      await expect(groupService.addMembers(validGroupId, newMembers))
        .rejects
        .toThrow('Group cannot have more than 50 members');
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const mockGroup = {
        _id: validGroupId,
        memberIds: [
          { equals: jest.fn((id) => id.toString() === validUserId1) },
          { equals: jest.fn((id) => id.toString() === validUserId2) },
          { equals: jest.fn((id) => id.toString() === validUserId3) }
        ],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      await groupService.removeMember(validGroupId, validUserId2);

      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should throw error if group not found', async () => {
      (Group.findById as jest.Mock).mockResolvedValue(null);

      await expect(groupService.removeMember('nonexistent', validUserId1))
        .rejects
        .toThrow('Group not found');
    });

    it('should throw error if removing member results in less than 2 members', async () => {
      const mockGroup = {
        memberIds: [
          { equals: jest.fn((id) => id.toString() === validUserId1) },
          { equals: jest.fn((id) => id.toString() === validUserId2) }
        ],
        save: jest.fn()
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      await expect(groupService.removeMember(validGroupId, validUserId1))
        .rejects
        .toThrow('Group must have at least 2 members');
    });
  });

  describe('validateMembership', () => {
    it('should return true if user is member', async () => {
      const mockGroup = {
        memberIds: [
          { equals: jest.fn((id) => id.toString() === validUserId1) }
        ]
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      const result = await groupService.validateMembership(validGroupId, validUserId1);

      expect(result).toBe(true);
    });

    it('should return false if user is not member', async () => {
      const mockGroup = {
        memberIds: [
          { equals: jest.fn().mockReturnValue(false) }
        ]
      };

      (Group.findById as jest.Mock).mockResolvedValue(mockGroup);

      const result = await groupService.validateMembership(validGroupId, validUserId2);

      expect(result).toBe(false);
    });

    it('should return false if group not found', async () => {
      (Group.findById as jest.Mock).mockResolvedValue(null);

      const result = await groupService.validateMembership('nonexistent', validUserId1);

      expect(result).toBe(false);
    });
  });
});
