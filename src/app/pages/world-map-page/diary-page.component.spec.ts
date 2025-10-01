import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DiaryPageComponent } from './diary-page.component';
import { CommentService } from '@service/comment.service';
import { UserService } from '@service/user.service';
import { Comment } from '@model/comment';
import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { UserProfileDto } from '@dto/user-profile.dto';
import { User } from '@model/user.model';
import { environment } from '../../../environments/environment';

class CommentServiceStub {
  create = jasmine.createSpy('create');
  listByStep = jasmine.createSpy('listByStep');
  delete = jasmine.createSpy('delete');
  update = jasmine.createSpy('update');
}

class UserServiceStub {
  private currentId: number | null = 1;
  private disabled = false;

  currentUserId(): number | null {
    return this.currentId;
  }

  setCurrentUserId(value: number | null): void {
    this.currentId = value;
  }

  setDisabled(value: boolean): void {
    this.disabled = value;
  }

  isCurrentUserDisabled(): boolean {
    return this.disabled;
  }

  getUserProfile(): ReturnType<UserService['getUserProfile']> {
    const profile: UserProfileDto = {
      id: 1,
      pseudo: 'owner',
      travelDiaries: [],
    };
    return of(profile);
  }
}

describe('DiaryPageComponent', () => {
  let component: DiaryPageComponent;
  let fixture: ComponentFixture<DiaryPageComponent>;
  let commentService: CommentServiceStub;
  let userService: UserServiceStub;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 99,
    pseudo: 'jane',
    avatar: '',
    biography: '',
    status: 'ACTIVE',
    enabled: true,
  };

  const baseStep: Step = {
    id: 1,
    title: 'Étape 1',
    description: 'Visite de la ville',
    latitude: 0,
    longitude: 0,
    media: [],
    country: 'France',
    city: 'Paris',
    continent: 'Europe',
    startDate: null,
    endDate: null,
    status: 'IN_PROGRESS',
    themeIds: [],
    themes: [],
    themeId: null,
    travelDiaryId: 1,
    isEditing: false,
    comments: [],
    likes: 0,
    likesCount: 0,
    viewerHasLiked: false,
    stepThemes: [],
  };

  const baseDiary: TravelDiary = {
    id: 10,
    title: 'Carnet',
    latitude: 0,
    longitude: 0,
    private: false,
    published: true,
    status: 'IN_PROGRESS',
    description: 'Carnet de test',
    steps: [baseStep],
    user: mockUser,
    media: null,
    canComment: true,
  };

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [DiaryPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommentService, useClass: CommentServiceStub },
        { provide: UserService, useClass: UserServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DiaryPageComponent);
    component = fixture.componentInstance;
    commentService = TestBed.inject(CommentService) as unknown as CommentServiceStub;
    userService = TestBed.inject(UserService) as unknown as UserServiceStub;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    commentService.create.calls.reset();
    commentService.delete.calls.reset();
    commentService.update.calls.reset();
    userService.setCurrentUserId(1);
    userService.setDisabled(false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reject comment submission when user is not authenticated', () => {
    userService.setCurrentUserId(null);
    component.state.setCurrentDiary(baseDiary);
    component.state.setSteps(baseDiary.steps);
    component.onCommentDraftChange(baseStep.id, 'Test');

    component.onSubmitComment(baseStep);

    expect(component.getCommentError(baseStep.id)).toBe('Vous devez être connecté pour commenter.');
    expect(commentService.create).not.toHaveBeenCalled();
  });

  it('should reject comment submission when the account is disabled', () => {
    userService.setCurrentUserId(1);
    userService.setDisabled(true);
    component.state.setCurrentDiary(baseDiary);
    component.state.setSteps(baseDiary.steps);
    component.onCommentDraftChange(baseStep.id, 'Test');

    component.onSubmitComment(baseStep);

    expect(component.getCommentError(baseStep.id)).toBe(
      'Votre compte est désactivé. Vous ne pouvez plus commenter.'
    );
    expect(commentService.create).not.toHaveBeenCalled();
  });

  it('should reject empty comment submission', () => {
    userService.setCurrentUserId(1);
    component.state.setCurrentDiary(baseDiary);
    component.state.setSteps(baseDiary.steps);
    component.onCommentDraftChange(baseStep.id, '   ');

    component.onSubmitComment(baseStep);

    expect(component.getCommentError(baseStep.id)).toBe('Le commentaire ne peut pas être vide.');
    expect(commentService.create).not.toHaveBeenCalled();
  });

  it('should append the new comment to the step on success', () => {
    userService.setCurrentUserId(1);
    component.state.setCurrentDiary(baseDiary);
    component.state.setSteps(baseDiary.steps);

    const apiComment: Comment = {
      id: 55,
      content: 'Super voyage !',
      status: 'APPROVED',
      createdAt: '2024-07-01T10:00:00Z',
      updatedAt: '2024-07-01T10:00:00Z',
      user: mockUser,
    };
    commentService.create.and.returnValue(of(apiComment));

    component.onCommentDraftChange(baseStep.id, 'Super voyage !');
    component.onSubmitComment(baseStep);

    const comments = component.state.steps()[0].comments ?? [];
    expect(commentService.create).toHaveBeenCalledWith(baseStep.id, 'Super voyage !');
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe('Super voyage !');
    expect(component.getCommentDraft(baseStep.id)).toBe('');
    expect(component.getCommentError(baseStep.id)).toBeNull();
  });

  it('should skip deletion when the viewer is not the diary owner', () => {
    userService.setCurrentUserId(1);
    const diary = { ...baseDiary } satisfies TravelDiary;
    const comment: Comment = {
      id: 200,
      content: 'Super voyage !',
      status: 'APPROVED',
      createdAt: '2024-07-01T10:00:00Z',
      updatedAt: '2024-07-01T10:00:00Z',
      user: mockUser,
    };
    const step: Step = { ...baseStep, comments: [comment] };

    component.state.setCurrentDiary({ ...diary, steps: [step] });
    component.state.setSteps([step]);

    component.onDeleteComment(step, comment);

    expect(commentService.delete).not.toHaveBeenCalled();
    const comments = component.state.steps()[0].comments ?? [];
    expect(comments.length).toBe(1);
  });

  it('should delete a comment when the viewer owns the diary', () => {
    userService.setCurrentUserId(99);
    const diary = { ...baseDiary } satisfies TravelDiary;
    const comment: Comment = {
      id: 201,
      content: 'Merci pour le partage',
      status: 'APPROVED',
      createdAt: '2024-07-02T10:00:00Z',
      updatedAt: '2024-07-02T10:00:00Z',
      user: mockUser,
    };
    const step: Step = { ...baseStep, comments: [comment] };

    component.state.setCurrentDiary({ ...diary, steps: [step] });
    component.state.setSteps([step]);
    commentService.delete.and.returnValue(of(void 0));

    component.onDeleteComment(step, comment);

    expect(commentService.delete).toHaveBeenCalledWith(comment.id);
    const comments = component.state.steps()[0].comments ?? [];
    expect(comments.length).toBe(0);
    expect(component.getCommentError(step.id)).toBeNull();
    expect(component.isCommentDeleting(comment.id)).toBeFalse();
  });

  it('should allow comment authors to edit their own comment', () => {
    userService.setCurrentUserId(200);

    const diary: TravelDiary = {
      ...baseDiary,
      user: { ...mockUser, id: 999, pseudo: 'owner' },
      steps: [],
    };

    const comment: Comment = {
      id: 300,
      content: 'Commentaire initial',
      status: 'APPROVED',
      createdAt: '2024-07-03T10:00:00Z',
      updatedAt: '2024-07-03T10:00:00Z',
      user: { ...mockUser, id: 200, pseudo: 'author' },
    };

    const step: Step = { ...baseStep, comments: [comment] };

    component.state.setCurrentDiary({ ...diary, steps: [step] });
    component.state.setSteps([step]);

    component.onEditComment(step, comment);

    expect(component.isCommentEditing(comment.id)).toBeTrue();
    expect(component.getCommentEditDraft(comment.id)).toBe('Commentaire initial');
  });

  it('should persist comment edition and update the timeline', () => {
    userService.setCurrentUserId(99);

    const comment: Comment = {
      id: 400,
      content: 'Ancien contenu',
      status: 'APPROVED',
      createdAt: '2024-07-04T10:00:00Z',
      updatedAt: '2024-07-04T10:00:00Z',
      user: mockUser,
    };

    const step: Step = { ...baseStep, comments: [comment] };

    component.state.setCurrentDiary({ ...baseDiary, steps: [step] });
    component.state.setSteps([step]);

    const updatedComment: Comment = {
      ...comment,
      content: 'Contenu mis à jour',
      updatedAt: '2024-07-04T11:00:00Z',
    };

    commentService.update.and.returnValue(of(updatedComment));

    component.onEditComment(step, comment);
    component.onCommentEditDraftChange(comment.id, 'Contenu mis à jour');
    component.onSubmitCommentEdit(step, comment);

    expect(commentService.update).toHaveBeenCalledWith(comment.id, step.id, 'Contenu mis à jour');
    const comments = component.state.steps()[0].comments ?? [];
    expect(comments[0].content).toBe('Contenu mis à jour');
    expect(component.isCommentEditing(comment.id)).toBeFalse();
    expect(component.isCommentUpdating(comment.id)).toBeFalse();
    expect(component.getCommentEditError(comment.id)).toBeNull();
  });

  it('should optimistically increment likes and sync with the backend response', () => {
    const diary: TravelDiary = {
      ...baseDiary,
      steps: [{ ...baseStep, likes: 2, likesCount: 2 }],
    };

    component.state.setCurrentDiary(diary);
    component.state.setSteps(diary.steps);

    const step = component.state.steps()[0];
    const initialLikes = step.likes;

    component.handleButtonClick('like', step);

    expect(component.isStepLikePending(step.id)).toBeTrue();
    expect(component.state.steps()[0].likes).toBe(initialLikes + 1);
    expect(component.state.steps()[0].viewerHasLiked).toBeTrue();

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/${step.id}/likes`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ increment: true, delta: 1 });

    req.flush({ ...baseStep, id: step.id, likesCount: initialLikes + 3 });

    expect(component.state.steps()[0].likes).toBe(initialLikes + 3);
    expect(component.state.steps()[0].viewerHasLiked).toBeTrue();
    expect(component.isStepLikePending(step.id)).toBeFalse();

    httpMock.verify();
  });

  it('should revert the optimistic like when the backend request fails', () => {
    const diary: TravelDiary = {
      ...baseDiary,
      steps: [{ ...baseStep, likes: 4, likesCount: 4 }],
    };

    component.state.setCurrentDiary(diary);
    component.state.setSteps(diary.steps);

    const step = component.state.steps()[0];
    const initialLikes = step.likes;

    component.handleButtonClick('like', step);

    expect(component.state.steps()[0].likes).toBe(initialLikes + 1);
    expect(component.isStepLikePending(step.id)).toBeTrue();
    expect(component.state.steps()[0].viewerHasLiked).toBeTrue();

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/${step.id}/likes`);
    req.flush('Erreur', { status: 500, statusText: 'Server Error' });

    expect(component.state.steps()[0].likes).toBe(initialLikes);
    expect(component.state.steps()[0].viewerHasLiked).toBeFalse();
    expect(component.isStepLikePending(step.id)).toBeFalse();

    httpMock.verify();
  });

  it('should optimistically decrement likes and sync with the backend response', () => {
    const likedStep: Step = {
      ...baseStep,
      id: 7,
      likes: 5,
      likesCount: 5,
      viewerHasLiked: true,
    };
    const diary: TravelDiary = { ...baseDiary, steps: [likedStep] };

    component.state.setCurrentDiary(diary);
    component.state.setSteps(diary.steps);
    component.state.updateStepLikeState(likedStep.id, likedStep.likes, true);

    const step = component.state.steps()[0];
    component.handleButtonClick('like', step);

    expect(component.isStepLikePending(step.id)).toBeTrue();
    expect(component.state.steps()[0].likes).toBe(likedStep.likes - 1);
    expect(component.state.steps()[0].viewerHasLiked).toBeFalse();

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/${step.id}/likes`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ increment: false, delta: -1 });

    req.flush({ ...likedStep, likesCount: likedStep.likes - 1 });

    expect(component.state.steps()[0].likes).toBe(likedStep.likes - 1);
    expect(component.state.steps()[0].viewerHasLiked).toBeFalse();
    expect(component.isStepLikePending(step.id)).toBeFalse();

    httpMock.verify();
  });

  it('should revert the optimistic decrement when the backend request fails', () => {
    const likedStep: Step = {
      ...baseStep,
      id: 8,
      likes: 3,
      likesCount: 3,
      viewerHasLiked: true,
    };
    const diary: TravelDiary = { ...baseDiary, steps: [likedStep] };

    component.state.setCurrentDiary(diary);
    component.state.setSteps(diary.steps);
    component.state.updateStepLikeState(likedStep.id, likedStep.likes, true);

    const step = component.state.steps()[0];
    component.handleButtonClick('like', step);

    expect(component.state.steps()[0].likes).toBe(likedStep.likes - 1);
    expect(component.state.steps()[0].viewerHasLiked).toBeFalse();
    expect(component.isStepLikePending(step.id)).toBeTrue();

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/${step.id}/likes`);
    req.flush('Erreur', { status: 500, statusText: 'Server Error' });

    expect(component.state.steps()[0].likes).toBe(likedStep.likes);
    expect(component.state.steps()[0].viewerHasLiked).toBeTrue();
    expect(component.isStepLikePending(step.id)).toBeFalse();

    httpMock.verify();
  });

  it('should hide the like label when the counter is zero', () => {
    const step: Step = { ...baseStep, likes: 0 };

    expect(component.formatLikeLabel(step)).toBe('');
    expect(component.formatLikeLabel(null)).toBe('');
  });

  it('should format the like label with a positive counter', () => {
    const step: Step = { ...baseStep, likes: 7 };

    expect(component.formatLikeLabel(step)).toBe('7');
  });

  it('should coerce string like counters when formatting the label', () => {
    const step: Step = { ...baseStep, likes: '3' as unknown as number };

    expect(component.formatLikeLabel(step)).toBe('3');
    expect(component.formatLikeLabel({ ...step, likes: undefined, likesCount: '2' as unknown as number })).toBe('2');
  });

  it('should avoid refetching the owner profile when likes update locally', () => {
    const getProfileSpy = spyOn(userService, 'getUserProfile').and.returnValue(
      of({
        id: 1,
        pseudo: 'owner',
        travelDiaries: [],
      })
    );

    const diary = {
      ...baseDiary,
      user: undefined as unknown as User,
      userId: 1,
    } as TravelDiary;

    component.state.setCurrentDiary(diary);
    component.state.setSteps(diary.steps);

    expect(getProfileSpy).toHaveBeenCalledTimes(1);

    getProfileSpy.calls.reset();

    component.state.updateStepLikeState(baseStep.id, 1, true);

    expect(getProfileSpy).not.toHaveBeenCalled();
  });
});
