import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  participantRoles: {
    type: Map,
    of: String,
    default: () => new Map()
  },
  messages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'archived'],
    default: 'active'
  },
  anonymous: {
    type: Boolean,
    default: false
  }
});

// Method to add a message to the conversation
conversationSchema.methods.addMessage = async function(messageData) {
  const Message = mongoose.model('Message');
  
  // Create new message
  const message = new Message(messageData);
  await message.save();
  
  // Add message to this conversation
  this.messages.push(message._id);
  await this.save();
  
  return message;
};

// Method to end a conversation
conversationSchema.methods.end = async function() {
  this.status = 'ended';
  this.endedAt = new Date();
  return this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;